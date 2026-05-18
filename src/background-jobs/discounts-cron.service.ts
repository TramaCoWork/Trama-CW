import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { DiscountsService } from '../discounts/discounts.service';

type CronScheduleConfig = Record<string, string | null>;

@Injectable()
export class DiscountsCronService implements OnModuleInit {
  private readonly logger = new Logger(DiscountsCronService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly discountsService: DiscountsService,
  ) {}

  onModuleInit() {
    const cronSchedule = JSON.parse(this.configService.getOrThrow<string>('CRON_SCHEDULE')) as CronScheduleConfig;

    this.registerJob('applyDiscounts', cronSchedule.applyDiscounts, () => this.handleApplyDiscounts());
    this.registerJob('restoreDiscounts', cronSchedule.restoreDiscounts, () => this.handleRestoreDiscounts());
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

  async handleApplyDiscounts() {
    const count = await this.discountsService.applyPendingDiscounts();
    if (count > 0) {
      this.logger.log(`Processed ${count} pending discounts`);
    }
  }

  async handleRestoreDiscounts() {
    const count = await this.discountsService.restoreExpiredDiscounts();
    if (count > 0) {
      this.logger.log(`Restored ${count} expired discounts`);
    }
  }
}

// Traceability: implemented by @programmer at 2026-05-18 18:34:52
