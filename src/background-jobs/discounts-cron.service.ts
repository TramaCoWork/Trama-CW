import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { DiscountsService } from '../discounts/discounts.service';
import { PrismaService } from '../prisma/prisma.service';
import { BaseCronService, JobResult } from './base-cron.service';

@Injectable()
export class DiscountsCronService
  extends BaseCronService
  implements OnModuleInit
{
  protected readonly logger = new Logger(DiscountsCronService.name);

  constructor(
    prisma: PrismaService,
    configService: ConfigService,
    schedulerRegistry: SchedulerRegistry,
    private readonly discountsService: DiscountsService,
  ) {
    super(prisma, configService, schedulerRegistry);
  }

  onModuleInit() {
    const cronSchedule = this.getCronSchedule();

    this.registerJob('applyDiscounts', cronSchedule.applyDiscounts, () =>
      this.handleApplyDiscounts(),
    );
    this.registerJob('restoreDiscounts', cronSchedule.restoreDiscounts, () =>
      this.handleRestoreDiscounts(),
    );
  }

  async handleApplyDiscounts(): Promise<JobResult> {
    const count = await this.discountsService.applyPendingDiscounts();
    if (count > 0) {
      this.logger.log(`Processed ${count} pending discounts`);
    }

    return { processedCount: count };
  }

  async handleRestoreDiscounts(): Promise<JobResult> {
    const count = await this.discountsService.restoreExpiredDiscounts();
    if (count > 0) {
      this.logger.log(`Restored ${count} expired discounts`);
    }

    return { processedCount: count };
  }
}

// Traceability: implemented by @programmer at 2026-05-18 18:34:52
