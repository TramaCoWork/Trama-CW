import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { BaseCronService, JobResult } from './base-cron.service';

@Injectable()
export class OnboardingReminderCronService
  extends BaseCronService
  implements OnModuleInit
{
  protected readonly logger = new Logger(OnboardingReminderCronService.name);

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

    this.registerJob(
      'onboardingReminder',
      cronSchedule.onboardingReminder,
      () => this.handleOnboardingReminder(),
    );
  }

  async handleOnboardingReminder(): Promise<JobResult> {
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const profiles = await this.prisma.professionalProfile.findMany({
      where: {
        deletedAt: null,
        profileStatus: 'onboarding',
        createdAt: { gte: threeMonthsAgo },
      },
      include: { user: { select: { email: true } } },
    });

    for (const profile of profiles) {
      const name = profile.name ?? profile.user.email;
      await this.mailService.sendOnboardingReminder(profile.user.email, name);
    }

    return { processedCount: profiles.length };
  }
}
