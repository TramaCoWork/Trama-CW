import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';

type CronScheduleConfig = Record<string, string | null>;

@Injectable()
export class TrialReminderCronService implements OnModuleInit {
  private readonly logger = new Logger(TrialReminderCronService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  onModuleInit() {
    const cronSchedule = JSON.parse(this.configService.getOrThrow<string>('CRON_SCHEDULE')) as CronScheduleConfig;

    this.registerJob('trial-expiring-reminder', cronSchedule.trialExpiringReminder, () =>
      this.handleTrialExpiringReminder(),
    );
  }

  private registerJob(jobName: string, schedule: string | null | undefined, handler: () => Promise<void>) {
    if (typeof schedule !== 'string') {
      return;
    }

    const job = new CronJob(schedule, async () => {
      const startTime = Date.now();
      this.logger.log(`Iniciando ${jobName}...`);
      await handler();
      this.logger.log(`Finalizado ${jobName} (duración: ${Date.now() - startTime}ms)`);
    });

    this.logger.log(`Job ${jobName} registrado con schedule: ${schedule}`);
    this.schedulerRegistry.addCronJob(jobName, job);
    job.start();
  }

  async handleTrialExpiringReminder() {
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
      await this.mailService.sendTrialExpiringReminder(profile.user.email, name);
    }
  }
}
