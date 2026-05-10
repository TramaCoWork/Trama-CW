import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProfessionalsCronService {
  private readonly logger = new Logger(ProfessionalsCronService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleExpiredTrials() {
    const now = new Date();

    const result = await this.prisma.professionalProfile.updateMany({
      where: {
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

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
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
