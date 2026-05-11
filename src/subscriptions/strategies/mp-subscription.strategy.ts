import { Injectable, Logger } from '@nestjs/common';
import { MercadoPagoService } from '../../mercadopago/mercadopago.service';
import {
  PaymentStrategy,
  CreatePaymentData,
  CreatePaymentResult,
  CancelResult,
  RenewalResult,
  WebhookPaymentData,
} from './payment-strategy.interface';

@Injectable()
export class MpSubscriptionStrategy implements PaymentStrategy {
  readonly code = 'mp_subscription';
  private readonly logger = new Logger(MpSubscriptionStrategy.name);

  constructor(private readonly mercadopago: MercadoPagoService) {}

  async createPayment(data: CreatePaymentData): Promise<CreatePaymentResult> {
    const mpResult = await this.mercadopago.createPreapproval({
      reason: data.plan.name,
      amount: Number(data.plan.amount),
      currencyId: data.plan.currency,
      frequency: data.plan.frequency,
      frequencyType: data.plan.frequencyType as 'days' | 'months',
      trialDays: data.plan.trialDays,
      payerEmail: data.payerEmail,
      backUrl: data.backUrl,
      notificationUrl: data.notificationUrl,
      externalReference: data.subscriptionId,
    });

    this.logger.log(`Preapproval created: ${data.subscriptionId} -> MP: ${mpResult.id} (subscription mode)`);

    return { initPoint: mpResult.init_point!, externalId: mpResult.id?.toString()! };
  }

  async handlePaymentWebhook(paymentId: string): Promise<{
    subscriptionId: string;
    data: WebhookPaymentData;
    shouldActivate: boolean;
  } | null> {
    const payment = await this.mercadopago.getPayment(paymentId);

    // Solo procesar pagos vinculados a preapproval
    const preapprovalId = (payment as any).metadata?.preapproval_id;
    if (!preapprovalId) return null;

    const status = payment.status as string;
    this.logger.log(`Payment ${paymentId} status: ${status} for preapproval: ${preapprovalId}`);

    const paymentDetails: WebhookPaymentData = {
      paymentExternalId: paymentId,
      amount: payment.transaction_amount ?? 0,
      status: status === 'approved' ? 'sub_approved' : 'sub_rejected',
      failureReason: status !== 'approved' ? (payment.status_detail ?? status) : undefined,
      paymentMethod: (payment as any).payment_type_id ?? null,
      paymentMethodId: (payment as any).payment_method_id ?? null,
      cardLastFourDigits: (payment as any).card?.last_four_digits ?? null,
      installments: (payment as any).installments ?? null,
      statusDetail: payment.status_detail ?? null,
      metadata: JSON.parse(JSON.stringify(payment)),
    };

    // Para subscription mode, el subscriptionId es el externalId de la preapproval (no nuestro UUID)
    // Lo marcamos con un prefijo para que el service sepa buscar por externalId
    return {
      subscriptionId: `ext:${preapprovalId}`,
      data: paymentDetails,
      shouldActivate: false, // La activación la maneja handleGatewayWebhook con el status de preapproval
    };
  }

  async handleGatewayWebhook(eventType: string, dataId: string): Promise<{
    externalId: string;
    status: string;
    startDate?: Date;
    externalReference?: string;
  } | null> {
    if (eventType !== 'subscription_preapproval') return null;

    const preapproval = await this.mercadopago.getPreapproval(dataId);
    const status = preapproval.status as string;
    const externalReference = (preapproval as any).external_reference as string | undefined;

    this.logger.log(`Preapproval ${dataId} status: ${status} | external_reference: ${externalReference ?? 'none'}`);

    const statusMap: Record<string, string> = {
      pending: 'pending',
      authorized: 'authorized',
      active: 'active',
      paused: 'paused',
      cancelled: 'cancelled',
    };

    const mappedStatus = statusMap[status];
    if (!mappedStatus) {
      this.logger.warn(`Unknown preapproval status: ${status}`);
      return null;
    }

    const startDate = (status === 'authorized' || status === 'active') && preapproval.date_created
      ? new Date(preapproval.date_created)
      : undefined;

    return {
      externalId: dataId,
      status: mappedStatus,
      startDate,
      externalReference,
    };
  }

  async cancelSubscription(externalId: string | null, _endDate: Date | null): Promise<CancelResult> {
    let endDate = new Date();

    if (externalId) {
      await this.mercadopago.cancelPreapproval(externalId);

      try {
        const preapproval = await this.mercadopago.getPreapproval(externalId);
        const nextPayment = (preapproval as any).next_payment_date;
        if (nextPayment) {
          endDate = new Date(nextPayment);
          this.logger.log(`Preapproval ${externalId} paid until: ${endDate.toISOString()}`);
        }
      } catch (error) {
        this.logger.warn(`Could not fetch preapproval details for endDate: ${error.message}`);
      }
    }

    return { endDate };
  }

  async handleRenewal(_data: CreatePaymentData): Promise<RenewalResult | null> {
    // PreApproval se renueva automáticamente en MP, no necesita acción del cron.
    return null;
  }
}
