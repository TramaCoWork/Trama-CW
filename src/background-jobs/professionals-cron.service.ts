import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { BaseCronService, JobResult } from './base-cron.service';

@Injectable()
export class ProfessionalsCronService
  extends BaseCronService
  implements OnModuleInit
{
  protected readonly logger = new Logger(ProfessionalsCronService.name);

  constructor(
    prisma: PrismaService,
    configService: ConfigService,
    schedulerRegistry: SchedulerRegistry,
  ) {
    super(prisma, configService, schedulerRegistry);
  }

  async onModuleInit() {
    const cronSchedule = await this.getCronSchedule();

    this.registerJob('expiredTrials', cronSchedule.expiredTrials, () =>
      this.handleExpiredTrials(),
    );
    this.registerJob(
      'expiredCancelledSubs',
      cronSchedule.expiredCancelledSubs,
      () => this.handleExpiredCancelledSubscriptions(),
    );
  }

  async handleExpiredTrials(): Promise<JobResult> {
    const now = new Date();

    const result = await this.prisma.professionalProfile.updateMany({
      where: {
        deletedAt: null,
        profileStatus: 'active',
        trialEndDate: { lt: now },
      },
      data: {
        profileStatus: 'waiting_payment',
        isActive: false,
        trialEndDate: null,
      },
    });

    if (result.count > 0) {
      this.logger.log(
        `Expired trials: ${result.count} profiles moved to waiting_payment`,
      );
    }

    return { processedCount: result.count };
  }

  async handleExpiredCancelledSubscriptions(): Promise<JobResult> {
    const now = new Date();
    let deactivatedProfiles = 0;

    // Buscar suscripciones canceladas cuyo período pagado ya venció
    const expiredSubs = await this.prisma.subscription.findMany({
      where: {
        status: 'cancelled',
        endDate: { lte: now },
      },
      select: { userId: true },
    });

    if (!expiredSubs.length) {
      return { processedCount: 0 };
    }

    const userIds = expiredSubs.map((s) => s.userId);

    // Solo desactivar perfiles que sigan activos (sin otra suscripción activa)
    for (const userId of userIds) {
      // Verificar que no tenga otra suscripción activa
      const activeSub = await this.prisma.subscription.findFirst({
        where: {
          userId,
          status: { in: ['authorized', 'active'] },
        },
      });

      if (activeSub) continue;

      const result = await this.prisma.professionalProfile.updateMany({
        where: {
          deletedAt: null,
          userId,
          profileStatus: 'active',
          isActive: true,
        },
        data: {
          profileStatus: 'waiting_payment',
          isActive: false,
        },
      });

      if (result.count > 0) {
        deactivatedProfiles += result.count;
        this.logger.log(
          `Cancelled subscription expired: user ${userId} moved to waiting_payment`,
        );
      }
    }

    return { processedCount: deactivatedProfiles };
  }
}

// Traceability: implemented by @programmer at 2026-05-18 18:34:52
