import { Injectable, Logger } from '@nestjs/common';
import { SubscriptionPlan } from '@prisma/client';
import { MercadoPagoService } from '../../mercadopago/mercadopago.service';
import {
  PaymentStrategy,
  CreatePaymentData,
  CreatePaymentResult,
  CancelResult,
  RenewalResult,
  WebhookPaymentData,
} from './payment-strategy.interface';

/** Datos que el front (Brick) envía al backend para crear el pago. */
export interface BricksPaymentData {
  subscriptionId: string;
  plan: SubscriptionPlan;
  payerEmail: string;
  notificationUrl: string;
  token: string;
  paymentMethodId: string;
  paymentType?: string; // credit_card | debit_card
  issuerId?: string;
  installments: number;
  identification?: { type: string; number: string };
}

/** Resultado sincrónico del cobro vía Bricks. */
export interface BricksPaymentResult {
  paymentId: string;
  /** Estado normalizado: approved | rejected | pending */
  status: string;
  statusDetail: string | null;
  data: WebhookPaymentData;
}

/**
 * Estrategia de Checkout Bricks.
 *
 * A diferencia de Checkout Pro (init_point + redirect), Bricks tokeniza la tarjeta
 * en el cliente y el front envía el token al backend, que crea el pago vía API y
 * obtiene el estado de forma SINCRÓNICA. No hay init_point.
 *
 * La activación de la suscripción la dispara `payWithToken` (resultado inmediato)
 * y la confirma el webhook (fuente de verdad / estados async), de forma idempotente.
 */
@Injectable()
export class MpBricksStrategy implements PaymentStrategy {
  readonly code = 'mp_bricks';
  private readonly logger = new Logger(MpBricksStrategy.name);

  constructor(private readonly mercadopago: MercadoPagoService) {}

  async createPayment(_data: CreatePaymentData): Promise<CreatePaymentResult> {
    throw new Error(
      'mp_bricks no genera init_point. Usá POST /subscriptions/bricks/pay con el token del Brick.',
    );
  }

  /** Crea el pago en MP (Orders API) a partir del token del Brick y devuelve el estado sincrónico. */
  async payWithToken(data: BricksPaymentData): Promise<BricksPaymentResult> {
    const order = await this.mercadopago.createOrderFromToken({
      token: data.token,
      amount: Number(data.plan.amount),
      installments: data.installments,
      paymentMethodId: data.paymentMethodId,
      paymentType: data.paymentType,
      payerEmail: data.payerEmail,
      payerIdentification: data.identification,
      externalReference: data.subscriptionId,
    });

    const payment = order?.transactions?.payments?.[0] ?? {};
    const rawStatus =
      (payment.status as string) ?? (order.status as string) ?? 'pending';
    const statusDetail =
      (payment.status_detail as string) ??
      (order.status_detail as string) ??
      null;
    const paymentId = String(payment.id ?? order.id);

    // Normalizar estados de Orders API → modelo interno
    // processed = aprobado | rejected = rechazado | resto (pending/in_process/action_required) = pendiente
    const status =
      rawStatus === 'processed'
        ? 'approved'
        : rawStatus === 'rejected'
          ? 'rejected'
          : 'pending';

    const paymentData: WebhookPaymentData = {
      paymentExternalId: paymentId,
      amount: Number(payment.amount ?? data.plan.amount),
      status: status === 'approved' ? 'sub_approved' : 'sub_rejected',
      failureReason:
        status !== 'approved' ? (statusDetail ?? rawStatus) : undefined,
      paymentMethod: payment.payment_method?.type ?? data.paymentType ?? null,
      paymentMethodId:
        payment.payment_method?.id ?? data.paymentMethodId ?? null,
      cardLastFourDigits:
        payment.payment_method?.card?.last_four_digits ?? null,
      installments:
        payment.payment_method?.installments ?? data.installments ?? null,
      statusDetail,
      metadata: order,
    };

    this.logger.log(
      `Bricks order ${order.id} | payment ${paymentId} | subscription ${data.subscriptionId}: ${rawStatus} -> ${status}`,
    );

    return { paymentId, status, statusDetail, data: paymentData };
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

    // Los pagos de preapproval los maneja MpSubscriptionStrategy
    const preapprovalId = (payment as any).metadata?.preapproval_id;
    if (preapprovalId) return null;

    const status = payment.status as string;
    this.logger.log(
      `Bricks webhook: payment ${paymentId} status ${status} for subscription ${externalReference}`,
    );

    const data: WebhookPaymentData = {
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
      data,
      shouldActivate: status === 'approved',
    };
  }

  async handleGatewayWebhook(): Promise<null> {
    // Bricks no emite eventos de gateway propios (solo "payment").
    return null;
  }

  async cancelSubscription(
    _externalId: string | null,
    endDate: Date | null,
  ): Promise<CancelResult> {
    // Bricks es un pago único por período: no hay nada que cancelar en MP.
    // El perfil permanece activo hasta el endDate ya pagado.
    return { endDate: endDate ?? new Date() };
  }

  async handleRenewal(data: CreatePaymentData): Promise<RenewalResult | null> {
    // Bricks no auto-cobra ni genera init_point. Devolvemos la URL de la página
    // que hospeda el Brick para que el cron deje la suscripción en pending,
    // desactive el perfil y notifique al usuario para que vuelva a pagar.
    // No devolvemos externalId: se conserva el del último pago hasta el nuevo cobro.
    return { initPoint: data.backUrl };
  }
}
