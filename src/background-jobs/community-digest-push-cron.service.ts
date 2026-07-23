import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { PostStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { withoutDeleted } from '../common/filters/soft-delete.filter';
import { OneSignalService } from '../onesignal/onesignal.service';
import { BaseCronService, JobResult } from './base-cron.service';

const GENERAL_CHANNEL = 'general';
const PUSH_PROVIDER = 'onesignal';
const COMMUNITY_DIGEST_PUSH_JOB = 'communityDigestPush';
const FALLBACK_SCHEDULE = '0 10 * * *';
// Piso de mirada hacia atras para no notificar historia vieja en la 1ra corrida.
const LOOKBACK_DAYS = 30;

type ChannelRef = { slug: string; name: string };

@Injectable()
export class CommunityDigestPushCronService
  extends BaseCronService
  implements OnModuleInit
{
  protected readonly logger = new Logger(CommunityDigestPushCronService.name);

  constructor(
    prisma: PrismaService,
    configService: ConfigService,
    schedulerRegistry: SchedulerRegistry,
    private readonly oneSignal: OneSignalService,
  ) {
    super(prisma, configService, schedulerRegistry);
  }

  async onModuleInit() {
    const cronSchedule = await this.getCronSchedule();
    this.registerJob(
      COMMUNITY_DIGEST_PUSH_JOB,
      cronSchedule[COMMUNITY_DIGEST_PUSH_JOB] ?? FALLBACK_SCHEDULE,
      () => this.handleCommunityDigestPush(),
    );
  }

  async handleCommunityDigestPush(): Promise<JobResult> {
    const floor = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);

    const professionals = await this.prisma.professionalProfile.findMany({
      where: withoutDeleted({}),
      select: {
        userId: true,
        rubro: { select: { slug: true, name: true } },
      },
    });

    let pushesSent = 0;

    for (const professional of professionals) {
      const sent = await this.notifyUser(professional, floor);
      if (sent) {
        pushesSent += 1;
      }
    }

    return { processedCount: pushesSent };
  }

  private async notifyUser(
    professional: {
      userId: string;
      rubro: { slug: string; name: string } | null;
    },
    floor: Date,
  ): Promise<boolean> {
    const userId = professional.userId;

    const channels: ChannelRef[] = [
      { slug: GENERAL_CHANNEL, name: 'General' },
    ];
    if (professional.rubro) {
      channels.push({
        slug: professional.rubro.slug,
        name: professional.rubro.name,
      });
    }

    const slugs = channels.map((channel) => channel.slug);

    const [prefs, lastSeenRecords] = await Promise.all([
      this.prisma.notificationPreference.findMany({
        where: { userId, sourceType: 'community', sourceId: { in: slugs } },
        select: { sourceId: true, push: true },
      }),
      this.prisma.communityLastSeen.findMany({
        where: { userId, channelSlug: { in: slugs } },
        select: {
          channelSlug: true,
          lastSeenAt: true,
          lastPushNotifiedAt: true,
        },
      }),
    ]);

    const pushDisabled = new Set(
      prefs.filter((pref) => pref.push === false).map((pref) => pref.sourceId),
    );
    const lastSeenMap = new Map(
      lastSeenRecords.map((record) => [record.channelSlug, record]),
    );

    const contributions: { slug: string; name: string; count: number }[] = [];

    for (const channel of channels) {
      if (pushDisabled.has(channel.slug)) {
        continue;
      }

      const record = lastSeenMap.get(channel.slug);
      const since = this.latestDate([
        record?.lastSeenAt,
        record?.lastPushNotifiedAt,
        floor,
      ]);

      const count = await this.prisma.communityPost.count({
        where: {
          channelSlug: channel.slug,
          deletedAt: null,
          status: PostStatus.published,
          createdAt: { gt: since },
        },
      });

      if (count > 0) {
        contributions.push({ ...channel, count });
      }
    }

    if (contributions.length === 0) {
      return false;
    }

    const subscriptions = await this.prisma.pushSubscription.findMany({
      where: { userId, provider: PUSH_PROVIDER },
      select: { subscriptionId: true },
    });
    if (subscriptions.length === 0) {
      return false;
    }

    await this.oneSignal.sendToSubscriptions({
      subscriptionIds: subscriptions.map((sub) => sub.subscriptionId),
      title: this.buildTitle(contributions),
      message: this.buildMessage(contributions),
      data: {
        type: 'community-digest',
        channels: contributions.map((item) => item.slug),
      },
    });

    await this.markPushNotified(
      userId,
      contributions.map((item) => item.slug),
    );

    return true;
  }

  private latestDate(dates: (Date | null | undefined)[]): Date {
    return dates.reduce<Date>((max, date) => {
      if (date && date.getTime() > max.getTime()) {
        return date;
      }
      return max;
    }, new Date(0));
  }

  private buildTitle(
    contributions: { name: string }[],
  ): string {
    return contributions.length === 1
      ? contributions[0].name
      : 'Comunidad Trama';
  }

  private buildMessage(
    contributions: { name: string; count: number }[],
  ): string {
    if (contributions.length === 1) {
      const { count, name } = contributions[0];
      const noun = count === 1 ? 'nuevo post' : 'nuevos posts';
      return `Tenés ${count} ${noun} en ${name}`;
    }

    const parts = contributions.map((item) => `${item.name} (${item.count})`);
    return `Tenés novedades en ${parts.join(', ')}`;
  }

  private async markPushNotified(
    userId: string,
    channelSlugs: string[],
  ): Promise<void> {
    const now = new Date();
    await Promise.all(
      channelSlugs.map((channelSlug) =>
        this.prisma.communityLastSeen.upsert({
          where: { userId_channelSlug: { userId, channelSlug } },
          update: { lastPushNotifiedAt: now },
          // lastSeenAt en epoch para NO marcar como leido (no afecta el badge).
          create: {
            userId,
            channelSlug,
            lastSeenAt: new Date(0),
            lastPushNotifiedAt: now,
          },
        }),
      ),
    );
  }
}
