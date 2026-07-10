import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { MercadoPagoService } from '../mercadopago/mercadopago.service';
import { BaseCronService, JobResult } from './base-cron.service';

@Injectable()
export class SubscriptionRenewPreapprovalCronService
  extends BaseCronService
  implements OnModuleInit
{
  protected readonly logger = new Logger(
    SubscriptionRenewPreapprovalCronService.name,
  );

  constructor(
    prisma: PrismaService,
    configService: ConfigService,
    schedulerRegistry: SchedulerRegistry,
    private readonly mercadoPagoService: MercadoPagoService,
  ) {
    super(prisma, configService, schedulerRegistry);
  }

  async onModuleInit() {
    const cronSchedule = await this.getCronSchedule();

    this.registerJob(
      'subscriptionRenewPreapproval',
      cronSchedule.subscriptionRenewPreapproval,
      () => this.handleRenewPreapproval(),
    );
  }

  async handleRenewPreapproval(): Promise<JobResult> {
    const now = new Date();

    const expiredSubs = await this.prisma.subscription.findMany({
      where: {
        status: 'active',
        endDate: { lte: now },
        paymentStrategy: { in: ['mp_subscription', 'mp_bricks_subscription'] },
        externalId: { not: null },
      },
      include: {
        plan: true,
        user: { select: { id: true, email: true } },
      },
    });

    let processedCount = 0;
    const affectedUserIds: string[] = [];

    for (const sub of expiredSubs) {
      if (!sub.externalId) {
        continue;
      }

      try {
        const preapproval = await this.mercadoPagoService.getPreapproval(
          sub.externalId,
        );
        const mpStatus = preapproval.status;

        if (mpStatus === 'authorized') {
          const endDate = this.computeEndDate(
            { frequency: sub.plan.frequency, frequencyType: sub.plan.frequencyType },
            now,
          );

          await this.prisma.subscription.update({
            where: { id: sub.id },
            data: { endDate, status: 'active' },
          });

          await this.prisma.professionalProfile.updateMany({
            where: { userId: sub.userId, deletedAt: null },
            data: { isActive: true, profileStatus: 'active' },
          });

          this.logger.log(
            `Subscription ${sub.id} endDate extended (webhook recovery)`,
          );
        } else {
          const nextStatus = mpStatus === 'cancelled' ? 'cancelled' : 'paused';

          await this.prisma.subscription.update({
            where: { id: sub.id },
            data: { status: nextStatus },
          });

          await this.prisma.professionalProfile.updateMany({
            where: { userId: sub.userId, deletedAt: null },
            data: { isActive: false, profileStatus: 'waiting_payment' },
          });

          this.logger.log(
            `Subscription ${sub.id} deactivated — MP status: ${mpStatus}`,
          );
        }

        affectedUserIds.push(sub.userId);
        processedCount += 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(
          `Error processing preapproval sub ${sub.id}: ${message}`,
        );
      }
    }

    return {
      processedCount,
      metadata: { userIds: Array.from(new Set(affectedUserIds)) },
    };
  }

  private computeEndDate(
    plan: { frequency: number; frequencyType: string },
    from: Date,
  ): Date {
    const endDate = new Date(from);

    if (plan.frequencyType === 'months') {
      endDate.setMonth(endDate.getMonth() + plan.frequency);
      return endDate;
    }

    endDate.setDate(endDate.getDate() + plan.frequency);
    return endDate;
  }
}
