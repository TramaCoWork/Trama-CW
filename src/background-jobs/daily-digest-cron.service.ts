import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NotifSourceType } from '@prisma/client';
import { SchedulerRegistry } from '@nestjs/schedule';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { withoutDeleted } from '../common/filters/soft-delete.filter';
import { BaseCronService, JobResult } from './base-cron.service';

const GENERAL_CHANNEL = 'general';
const DAILY_DIGEST_JOB = 'dailyDigest';
const DAILY_DIGEST_FALLBACK_SCHEDULE = '0 7 * * *';
const DAILY_DIGEST_COOLDOWN_HOURS = 23;

type ChannelDigest = {
  type: 'community' | 'channel';
  slug: string;
  name: string;
  unreadCount: number;
};

@Injectable()
export class DailyDigestCronService
  extends BaseCronService
  implements OnModuleInit
{
  protected readonly logger = new Logger(DailyDigestCronService.name);

  constructor(
    prisma: PrismaService,
    configService: ConfigService,
    schedulerRegistry: SchedulerRegistry,
    private readonly mailService: MailService,
  ) {
    super(prisma, configService, schedulerRegistry);
  }

  async onModuleInit() {
    const cronSchedule = await this.getCronSchedule();
    const dailyDigestSchedule = cronSchedule.dailyDigest;

    this.registerJob(
      DAILY_DIGEST_JOB,
      dailyDigestSchedule ?? DAILY_DIGEST_FALLBACK_SCHEDULE,
      () => this.handleDailyDigest(),
    );
  }

  async handleDailyDigest(): Promise<JobResult> {
    const users = await this.prisma.user.findMany({
      where: { deletedAt: null },
      select: { id: true, email: true },
    });

    let emailsSent = 0;
    const affectedUserIds: string[] = [];

    for (const user of users) {
      const channels = await this.buildUserChannels(user.id);
      const unreadChannels = channels.filter((channel) => channel.unreadCount > 0);
      if (unreadChannels.length === 0) {
        continue;
      }

      const prefs = await this.prisma.notificationPreference.findMany({
        where: { userId: user.id },
      });

      const activeChannels = unreadChannels.filter((channel) => {
        const sourceType: NotifSourceType =
          channel.type === 'channel' ? 'channel' : 'community';
        const pref = prefs.find(
          (item) =>
            item.sourceId === channel.slug && item.sourceType === sourceType,
        );

        return pref?.email !== false;
      });

      if (activeChannels.length === 0) {
        continue;
      }

      const alreadyNotified = await this.wasRecentlyNotified(
        user.id,
        activeChannels,
      );
      if (alreadyNotified) {
        continue;
      }

      await this.mailService.sendDailyDigest(user.email, activeChannels);
      emailsSent += 1;
      affectedUserIds.push(user.id);

      await this.updateLastNotifiedAt(user.id, activeChannels);
    }

    return {
      processedCount: emailsSent,
      metadata: { userIds: affectedUserIds },
    };
  }

  private async buildUserChannels(userId: string): Promise<ChannelDigest[]> {
    const profile = await this.prisma.professionalProfile.findUnique({
      where: withoutDeleted({ userId }),
      include: { rubro: true },
    });

    const channelMembers = await this.prisma.communityChannelMember.findMany({
      where: {
        userId,
        accepted: true,
        channel: { isActive: true },
      },
      include: {
        channel: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    const communityChannels: Omit<ChannelDigest, 'unreadCount'>[] = [
      { type: 'community', slug: GENERAL_CHANNEL, name: 'General' },
    ];

    if (profile?.rubro) {
      communityChannels.push({
        type: 'community',
        slug: profile.rubro.slug,
        name: profile.rubro.name,
      });
    }

    const memberChannels: Omit<ChannelDigest, 'unreadCount'>[] = channelMembers.map(
      ({ channel }) => ({
        type: 'channel',
        slug: channel.id,
        name: channel.name,
      }),
    );

    const communityLastSeenRecords = await this.prisma.communityLastSeen.findMany({
      where: {
        userId,
        channelSlug: { in: communityChannels.map((channel) => channel.slug) },
      },
      select: {
        channelSlug: true,
        lastSeenAt: true,
      },
    });

    const channelLastSeenRecords = await this.prisma.channelLastSeen.findMany({
      where: {
        userId,
        channelId: { in: memberChannels.map((channel) => channel.slug) },
      },
      select: {
        channelId: true,
        lastSeenAt: true,
      },
    });

    const communityLastSeenMap = new Map(
      communityLastSeenRecords.map((record) => [record.channelSlug, record.lastSeenAt]),
    );

    const channelLastSeenMap = new Map(
      channelLastSeenRecords.map((record) => [record.channelId, record.lastSeenAt]),
    );

    const communityWithUnread = await Promise.all(
      communityChannels.map(async (channel) => {
        const lastSeenAt = communityLastSeenMap.get(channel.slug);
        const unreadCount = await this.prisma.communityPost.count({
          where: {
            channelSlug: channel.slug,
            deletedAt: null,
            status: 'published',
            ...(lastSeenAt ? { createdAt: { gt: lastSeenAt } } : {}),
          },
        });

        return { ...channel, unreadCount };
      }),
    );

    const memberWithUnread = await Promise.all(
      memberChannels.map(async (channel) => {
        const lastSeenAt = channelLastSeenMap.get(channel.slug);
        const unreadCount = await this.prisma.communityChannelPost.count({
          where: {
            channelId: channel.slug,
            deletedAt: null,
            status: 'published',
            ...(lastSeenAt ? { createdAt: { gt: lastSeenAt } } : {}),
          },
        });

        return { ...channel, unreadCount };
      }),
    );

    return [...communityWithUnread, ...memberWithUnread];
  }

  private async wasRecentlyNotified(
    userId: string,
    channels: ChannelDigest[],
  ): Promise<boolean> {
    const threshold = new Date(
      Date.now() - DAILY_DIGEST_COOLDOWN_HOURS * 60 * 60 * 1000,
    );

    const communityChannels = channels.filter(
      (channel) => channel.type === 'community',
    );
    const memberChannels = channels.filter((channel) => channel.type === 'channel');

    const [communityLastNotified, channelLastNotified] = await Promise.all([
      this.prisma.communityLastSeen.findMany({
        where: {
          userId,
          channelSlug: { in: communityChannels.map((channel) => channel.slug) },
        },
        select: {
          channelSlug: true,
          lastNotifiedAt: true,
        },
      }),
      this.prisma.channelLastSeen.findMany({
        where: {
          userId,
          channelId: { in: memberChannels.map((channel) => channel.slug) },
        },
        select: {
          channelId: true,
          lastNotifiedAt: true,
        },
      }),
    ]);

    const communityNotifiedMap = new Map(
      communityLastNotified.map((record) => [
        `community:${record.channelSlug}`,
        record.lastNotifiedAt,
      ]),
    );
    const channelNotifiedMap = new Map(
      channelLastNotified.map((record) => [
        `channel:${record.channelId}`,
        record.lastNotifiedAt,
      ]),
    );

    return channels.every((channel) => {
      const key = `${channel.type}:${channel.slug}`;
      const lastNotifiedAt =
        channel.type === 'community'
          ? communityNotifiedMap.get(key)
          : channelNotifiedMap.get(key);

      return Boolean(lastNotifiedAt && lastNotifiedAt > threshold);
    });
  }

  private async updateLastNotifiedAt(
    userId: string,
    channels: ChannelDigest[],
  ): Promise<void> {
    const now = new Date();

    await Promise.all(
      channels.map((channel) => {
        if (channel.type === 'community') {
          return this.prisma.communityLastSeen.upsert({
            where: {
              userId_channelSlug: { userId, channelSlug: channel.slug },
            },
            update: { lastNotifiedAt: now },
            create: {
              userId,
              channelSlug: channel.slug,
              lastSeenAt: now,
              lastNotifiedAt: now,
            },
          });
        }

        return this.prisma.channelLastSeen.upsert({
          where: {
            userId_channelId: { userId, channelId: channel.slug },
          },
          update: { lastNotifiedAt: now },
          create: {
            userId,
            channelId: channel.slug,
            lastSeenAt: now,
            lastNotifiedAt: now,
          },
        });
      }),
    );
  }
}
