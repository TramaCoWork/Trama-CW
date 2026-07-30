import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionsCronService } from '../subscriptions/subscriptions-cron.service';
import { BaseCronService, JobResult } from './base-cron.service';

@Injectable()
export class SubscriptionsCronBridge
  extends BaseCronService
  implements OnModuleInit
{
  protected readonly logger = new Logger(SubscriptionsCronBridge.name);

  constructor(
    prisma: PrismaService,
    configService: ConfigService,
    schedulerRegistry: SchedulerRegistry,
    private readonly subscriptionsCronService: SubscriptionsCronService,
  ) {
    super(prisma, configService, schedulerRegistry);
  }

  async onModuleInit() {
    const cronSchedule = await this.getCronSchedule();
    const paymentMode = this.configService.get<string>('PAYMENT_MODE');

    if (paymentMode !== 'subscription') {
      this.registerJob(
        'subscriptionRenewals',
        cronSchedule.subscriptionRenewals,
        () => this.handleRenewals(),
      );
    }

    // Cancelacion de pendientes viejos: aplica en cualquier PAYMENT_MODE.
    this.registerJob(
      'cancelStalePendingSubscriptions',
      cronSchedule.cancelStalePendingSubscriptions ?? '0 2 * * *',
      () => this.handleCancelStalePending(),
    );
  }

  private async handleRenewals(): Promise<JobResult> {
    const processedCount = await this.subscriptionsCronService.handleRenewals();
    return { processedCount };
  }

  private async handleCancelStalePending(): Promise<JobResult> {
    const processedCount =
      await this.subscriptionsCronService.cancelStalePending();
    return { processedCount };
  }
}

// Traceability: implemented by @programmer at 2026-05-18 18:34:52
