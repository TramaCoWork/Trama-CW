import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { BaseCronService, JobResult } from './base-cron.service';

@Injectable()
export class TrialReminderCronService
  extends BaseCronService
  implements OnModuleInit
{
  protected readonly logger = new Logger(TrialReminderCronService.name);

  constructor(
    prisma: PrismaService,
    configService: ConfigService,
    schedulerRegistry: SchedulerRegistry,
    private readonly mailService: MailService,
  ) {
    super(prisma, configService, schedulerRegistry);
  }

  onModuleInit() {
    const cronSchedule = this.getCronSchedule();

    this.registerJob(
      'trial-expiring-reminder',
      cronSchedule.trialExpiringReminder,
      () => this.handleTrialExpiringReminder(),
    );
  }

  async handleTrialExpiringReminder(): Promise<JobResult> {
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() + 5);
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setDate(end.getDate() + 1);

    const profiles = await this.prisma.professionalProfile.findMany({
      where: {
        deletedAt: null,
        trialEndDate: { gte: start, lt: end },
      },
      include: { user: { select: { email: true } } },
    });

    for (const profile of profiles) {
      const name = profile.name ?? profile.user.email;
      await this.mailService.sendTrialExpiringReminder(
        profile.user.email,
        name,
      );
    }

    return { processedCount: profiles.length };
  }
}
