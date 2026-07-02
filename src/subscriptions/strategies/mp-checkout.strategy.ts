import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
export class MpCheckoutStrategy implements PaymentStrategy {
  readonly code = 'mp_checkout';
  private readonly logger = new Logger(MpCheckoutStrategy.name);

  constructor(
    private readonly mercadopago: MercadoPagoService,
    private readonly config: ConfigService,
  ) {}

  async createPayment(data: CreatePaymentData): Promise<CreatePaymentResult> {
    const mpResult = await this.mercadopago.createPreference({
      title: data.plan.name,
      amount: Number(data.plan.amount),
      currencyId: data.plan.currency,
      payerEmail: data.payerEmail,
      backUrl: data.backUrl,
      notificationUrl: data.notificationUrl,
      externalReference: data.subscriptionId,
    });

    const isProduction = this.config.get<string>('NODE_ENV') === 'production';
    const initPoint = isProduction
      ? mpResult.init_point!
      : mpResult.sandbox_init_point!;

    this.logger.log(
      `Preference created: ${data.subscriptionId} -> MP: ${mpResult.id} (checkout mode)`,
    );

    return { initPoint, externalId: mpResult.id! };
  }

  async handlePaymentWebhook(paymentId: string): Promise<{
    subscriptionId: string;
    data: WebhookPaymentData;
    shouldActivate: boolean;
  } | null> {
    const payment = await this.mercadopago.getPayment(paymentId);
    const externalReference = (payment as any).external_reference as
      | string
      | undefined;

    if (!externalReference) return null;

    // Verificar que no sea un pago de preapproval (esos los maneja MpSubscriptionStrategy)
    const preapprovalId = (payment as any).metadata?.preapproval_id;
    if (preapprovalId) return null;

    const status = payment.status as string;
    this.logger.log(
      `Checkout payment ${paymentId} status: ${status} for subscription: ${externalReference}`,
    );

    const paymentDetails: WebhookPaymentData = {
      paymentExternalId: paymentId,
      amount: payment.transaction_amount ?? 0,
      status: status === 'approved' ? 'sub_approved' : 'sub_rejected',
      failureReason:
        status !== 'approved' ? (payment.status_detail ?? status) : undefined,
      paymentMethod: (payment as any).payment_type_id ?? null,
      paymentMethodId: (payment as any).payment_method_id ?? null,
      cardLastFourDigits: (payment as any).card?.last_four_digits ?? null,
      installments: (payment as any).installments ?? null,
      statusDetail: payment.status_detail ?? null,
      metadata: JSON.parse(JSON.stringify(payment)),
    };

    return {
      subscriptionId: externalReference,
      data: paymentDetails,
      shouldActivate: status === 'approved',
    };
  }

  async handleGatewayWebhook(
    _eventType: string,
    _dataId: string,
  ): Promise<{
    externalId: string;
    status: string;
    startDate?: Date;
    externalReference?: string;
  } | null> {
    // Checkout Pro no tiene eventos de gateway propios (solo "payment")
    return null;
  }

  async cancelSubscription(
    _externalId: string | null,
    endDate: Date | null,
  ): Promise<CancelResult> {
    // Checkout Pro: no hay nada que cancelar en MP.
    // El perfil permanece activo hasta el endDate existente.
    return { endDate: endDate ?? new Date() };
  }

  async handleRenewal(data: CreatePaymentData): Promise<RenewalResult> {
    // Generar nueva Preference para renovación
    const result = await this.createPayment(data);
    this.logger.log(
      `Checkout renewal preference created for subscription ${data.subscriptionId}`,
    );
    return result;
  }
}
