import { Injectable, Logger } from '@nestjs/common';
import { SubscriptionPlan } from '@prisma/client';
import { MercadoPagoService } from '../../mercadopago/mercadopago.service';
import {
  PaymentStrategy,
  CreatePaymentData,
  CreatePaymentResult,
  CancelResult,
  RenewalResult,
} from './payment-strategy.interface';

/** Datos para crear la suscripción recurrente con el card token del Brick. */
export interface BricksSubscribeData {
  subscriptionId: string;
  plan: SubscriptionPlan;
  payerEmail: string;
  cardTokenId: string;
  backUrl: string;
  notificationUrl: string;
}

/** Resultado de crear el preapproval. */
export interface BricksSubscribeResult {
  externalId: string; // preapproval id
  status: string; // authorized | pending | ...
  nextPaymentDate: string | null;
}

/**
 * Estrategia de Checkout Bricks + cobro automático (PreApproval con card_token_id).
 *
 * Combina la UI on-site de Bricks (tokeniza la tarjeta en el cliente) con la recurrencia
 * de PreApproval: MP cobra automáticamente cada período, sin redirect.
 *
 * Los webhooks (subscription_preapproval + pagos recurrentes con preapproval_id) los maneja
 * MpSubscriptionStrategy de forma genérica —matchea por preapproval_id, no por strategy code—,
 * por eso acá esos handlers devuelven null.
 */
@Injectable()
export class MpBricksSubscriptionStrategy implements PaymentStrategy {
  readonly code = 'mp_bricks_subscription';
  private readonly logger = new Logger(MpBricksSubscriptionStrategy.name);

  constructor(private readonly mercadopago: MercadoPagoService) {}

  async createPayment(_data: CreatePaymentData): Promise<CreatePaymentResult> {
    throw new Error(
      'mp_bricks_subscription no genera init_point. Usá POST /subscriptions/bricks/subscribe con el card token del Brick.',
    );
  }

  /** Crea el preapproval (cobro automático) con el card token del Brick. */
  async payWithCardToken(
    data: BricksSubscribeData,
  ): Promise<BricksSubscribeResult> {
    const result = await this.mercadopago.createPreapprovalWithCardToken({
      reason: data.plan.name,
      cardTokenId: data.cardTokenId,
      amount: Number(data.plan.amount),
      currencyId: data.plan.currency,
      frequency: data.plan.frequency,
      frequencyType: data.plan.frequencyType as 'days' | 'months',
      trialDays: data.plan.trialDays,
      payerEmail: data.payerEmail,
      externalReference: data.subscriptionId,
      backUrl: data.backUrl,
      notificationUrl: data.notificationUrl,
    });

    this.logger.log(
      `Bricks subscription preapproval ${result.id} for subscription ${data.subscriptionId}: ${result.status}`,
    );

    return {
      externalId: String(result.id),
      status: (result.status as string) ?? 'pending',
      nextPaymentDate: (result.next_payment_date as string) ?? null,
    };
  }

  async handlePaymentWebhook(): Promise<null> {
    return null; // lo maneja MpSubscriptionStrategy (pagos con preapproval_id)
  }

  async handleGatewayWebhook(): Promise<null> {
    return null; // lo maneja MpSubscriptionStrategy (subscription_preapproval)
  }

  async cancelSubscription(
    externalId: string | null,
    _endDate: Date | null,
  ): Promise<CancelResult> {
    let endDate = new Date();

    if (externalId) {
      await this.mercadopago.cancelPreapproval(externalId);
      try {
        const preapproval = await this.mercadopago.getPreapproval(externalId);
        const nextPayment = (preapproval as any).next_payment_date;
        if (nextPayment) {
          endDate = new Date(nextPayment);
          this.logger.log(
            `Preapproval ${externalId} paid until: ${endDate.toISOString()}`,
          );
        }
      } catch (error) {
        this.logger.warn(
          `Could not fetch preapproval details for endDate: ${error.message}`,
        );
      }
    }

    return { endDate };
  }

  async handleRenewal(_data: CreatePaymentData): Promise<RenewalResult | null> {
    // PreApproval se renueva automáticamente en MP; el cron no necesita hacer nada.
    return null;
  }
}
