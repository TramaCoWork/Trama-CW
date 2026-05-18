import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { SubscriptionsCronService } from '../subscriptions/subscriptions-cron.service';

type CronScheduleConfig = Record<string, string | null>;

@Injectable()
export class SubscriptionsCronBridge implements OnModuleInit {
  private readonly logger = new Logger(SubscriptionsCronBridge.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly subscriptionsCronService: SubscriptionsCronService,
  ) {}

  onModuleInit() {
    const cronSchedule = JSON.parse(this.configService.getOrThrow<string>('CRON_SCHEDULE')) as CronScheduleConfig;
    const schedule = cronSchedule.subscriptionRenewals;

    if (typeof schedule !== 'string') {
      return;
    }

    const jobName = 'subscriptionRenewals';
    const job = new CronJob(schedule, async () => {
      const startTime = Date.now();
      this.logger.log(`Iniciando ${jobName}...`);
      await this.subscriptionsCronService.handleRenewals();
      this.logger.log(`Finalizado ${jobName} (duración: ${Date.now() - startTime}ms)`);
    });

    this.logger.log(`Job ${jobName} registrado con schedule: ${schedule}`);
    this.schedulerRegistry.addCronJob(jobName, job);
    job.start();
  }
}

// Traceability: implemented by @programmer at 2026-05-18 18:34:52
