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
    const target = new Date();
    target.setDate(target.getDate() + 5);

    const yyyy = target.getFullYear();
    const mm = String(target.getMonth() + 1).padStart(2, '0');
    const dd = String(target.getDate()).padStart(2, '0');
    const targetDateStr = `${yyyy}-${mm}-${dd}`;

    const profiles = await this.prisma.$queryRaw<
      { id: string; name: string | null; email: string }[]
    >`
      SELECT pp.id, pp.name, u.email
      FROM professional_profiles pp
      JOIN users u ON u.id = pp.user_id
      WHERE pp.deleted_at IS NULL
        AND pp.trial_end_date::date = ${targetDateStr}::date
    `;

    for (const profile of profiles) {
      const name = profile.name ?? profile.email;
      await this.mailService.sendTrialExpiringReminder(profile.email, name);
    }

    return { processedCount: profiles.length };
  }
}
