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

  async onModuleInit() {
    const cronSchedule = await this.getCronSchedule();

    this.registerJob('applyDiscounts', cronSchedule.applyDiscounts, () =>
      this.handleApplyDiscounts(),
    );
    this.registerJob('restoreDiscounts', cronSchedule.restoreDiscounts, () =>
      this.handleRestoreDiscounts(),
    );
  }

  async handleApplyDiscounts(): Promise<JobResult> {
    const now = new Date();
    const subscriptions = await this.prisma.discount.findMany({
      where: {
        applied: false,
        startDate: { lte: now },
        endDate: { gte: now },
      },
      select: {
        professional: {
          select: {
            userId: true,
          },
        },
      },
    });

    const count = await this.discountsService.applyPendingDiscounts();
    if (count > 0) {
      this.logger.log(`Processed ${count} pending discounts`);
    }

    return {
      processedCount: count,
      metadata: {
        userIds: subscriptions.map((subscription) => subscription.professional.userId),
      },
    };
  }

  async handleRestoreDiscounts(): Promise<JobResult> {
    const now = new Date();
    const subscriptions = await this.prisma.discount.findMany({
      where: {
        applied: true,
        restored: false,
        endDate: { lt: now },
      },
      select: {
        professional: {
          select: {
            userId: true,
          },
        },
      },
    });

    const count = await this.discountsService.restoreExpiredDiscounts();
    if (count > 0) {
      this.logger.log(`Restored ${count} expired discounts`);
    }

    return {
      processedCount: count,
      metadata: {
        userIds: subscriptions.map((subscription) => subscription.professional.userId),
      },
    };
  }
}

// Traceability: implemented by @programmer at 2026-05-18 18:34:52
