import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { PrismaService } from '../prisma/prisma.service';
import { withoutDeleted } from '../common/filters/soft-delete.filter';

type CronScheduleConfig = Record<string, string | null>;

@Injectable()
export class ProfessionalsCronService implements OnModuleInit {
  private readonly logger = new Logger(ProfessionalsCronService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly prisma: PrismaService,
  ) {}

  onModuleInit() {
    const cronSchedule = JSON.parse(this.configService.getOrThrow<string>('CRON_SCHEDULE')) as CronScheduleConfig;

    this.registerJob('expiredTrials', cronSchedule.expiredTrials, () => this.handleExpiredTrials());
    this.registerJob('expiredCancelledSubs', cronSchedule.expiredCancelledSubs, () =>
      this.handleExpiredCancelledSubscriptions(),
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

  async handleExpiredTrials() {
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
      this.logger.log(`Expired trials: ${result.count} profiles moved to waiting_payment`);
    }
  }

  async handleExpiredCancelledSubscriptions() {
    const now = new Date();

    // Buscar suscripciones canceladas cuyo período pagado ya venció
    const expiredSubs = await this.prisma.subscription.findMany({
      where: {
        status: 'cancelled',
        endDate: { lte: now },
      },
      select: { userId: true },
    });

    if (!expiredSubs.length) return;

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
        this.logger.log(`Cancelled subscription expired: user ${userId} moved to waiting_payment`);
      }
    }
  }
}

// Traceability: implemented by @programmer at 2026-05-18 18:34:52
