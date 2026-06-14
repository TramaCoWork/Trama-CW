import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { PaymentStrategyFactory } from './strategies/payment-strategy.factory';
import { withoutDeleted } from '../common/filters/soft-delete.filter';

@Injectable()
export class SubscriptionsCronService {
  private readonly logger = new Logger(SubscriptionsCronService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly mail: MailService,
    private readonly strategyFactory: PaymentStrategyFactory,
  ) {}

  /**
   * Cron de renovación.
   * Para cada strategy registrada, busca suscripciones activas con endDate expirado
   * y delega la renovación al strategy correspondiente.
   */
  async handleRenewals() {
    const now = new Date();
    const strategies = this.strategyFactory.getAllStrategies();

    for (const strategy of strategies) {
      // Buscar suscripciones activas con endDate vencido para esta strategy
      const expiredSubs = await this.prisma.subscription.findMany({
        where: {
          status: 'active',
          endDate: { lte: now },
          paymentStrategy: strategy.code,
        },
        include: {
          plan: true,
          user: { select: { email: true } },
        },
      });

      if (!expiredSubs.length) continue;

      this.logger.log(`[${strategy.code}] Found ${expiredSubs.length} subscriptions to renew`);

      const notificationUrl = this.config.getOrThrow<string>('SUBSCRIPTION_NOTIFICATION_URL');
      const frontendUrl = this.config.get<string>('FRONTEND_URL', 'http://localhost:4321');

      for (const sub of expiredSubs) {
        try {
          const result = await strategy.handleRenewal({
            subscriptionId: sub.id,
            plan: sub.plan,
            payerEmail: sub.user.email,
            backUrl: `${frontendUrl}/subscription`,
            notificationUrl,
          });

          if (!result) {
            // Strategy no necesita renovación manual (e.g. preapproval automático)
            continue;
          }

          // Actualizar suscripción: volver a pending con nuevo initPoint.
          // Solo sobrescribir externalId si la strategy lo regeneró (e.g. checkout);
          // Bricks lo conserva hasta el próximo cobro.
          const renewalData: any = {
            status: 'pending',
            initPoint: result.initPoint,
          };
          if (result.externalId) {
            renewalData.externalId = result.externalId;
          }
          await this.prisma.subscription.update({
            where: { id: sub.id },
            data: renewalData,
          });

          // Desactivar perfil
          await this.prisma.professionalProfile.updateMany({
            where: withoutDeleted({ userId: sub.userId }),
            data: {
              profileStatus: 'waiting_payment',
              isActive: false,
            },
          });

          // Obtener nombre del profesional
          const profile = await this.prisma.professionalProfile.findFirst({
            where: withoutDeleted({ userId: sub.userId }),
            select: { name: true },
          });

          // Enviar email de recordatorio
          await this.mail.sendPaymentReminder(
            sub.user.email,
            profile?.name ?? 'Profesional',
            sub.plan.name,
            result.initPoint,
          );

          this.logger.log(`[${strategy.code}] Renewal processed: subscription ${sub.id}, email sent to ${sub.user.email}`);
        } catch (error) {
          this.logger.error(`[${strategy.code}] Error processing renewal for subscription ${sub.id}: ${error.message}`, error.stack);
        }
      }
    }
  }
}
