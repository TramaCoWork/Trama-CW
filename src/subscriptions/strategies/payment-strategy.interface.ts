import { SubscriptionPlan } from '@prisma/client';

/**
 * Datos necesarios para crear un pago/suscripción.
 */
export interface CreatePaymentData {
  subscriptionId: string;
  plan: SubscriptionPlan;
  payerEmail: string;
  backUrl: string;
  notificationUrl: string;
}

/**
 * Resultado de crear un pago/suscripción en el gateway.
 */
export interface CreatePaymentResult {
  initPoint: string;
  externalId: string;
}

/**
 * Resultado de cancelar una suscripción.
 */
export interface CancelResult {
  endDate: Date;
}

/**
 * Resultado de renovar una suscripción (checkout mode).
 */
export interface RenewalResult {
  initPoint: string;
  /** Id externo del gateway. Opcional: algunas strategies (e.g. Bricks) no lo regeneran en la renovación. */
  externalId?: string;
}

/**
 * Datos de pago extraídos del webhook para registrar.
 */
export interface WebhookPaymentData {
  paymentExternalId: string;
  webhookEventId?: string;
  amount: number;
  status: 'sub_approved' | 'sub_rejected';
  failureReason?: string;
  paymentMethod?: string | null;
  paymentMethodId?: string | null;
  cardLastFourDigits?: string | null;
  installments?: number | null;
  statusDetail?: string | null;
  metadata?: any;
}

/**
 * Interface que define el contrato de cada estrategia de pago.
 * Cada implementación maneja el ciclo completo: creación, webhook, cancelación y renovación.
 */
export interface PaymentStrategy {
  /** Código único del strategy (e.g. 'mp_checkout', 'mp_subscription') */
  readonly code: string;

  /** Crear el pago/suscripción en el gateway externo */
  createPayment(data: CreatePaymentData): Promise<CreatePaymentResult>;

  /**
   * Procesar un evento de webhook de tipo "payment".
   * Retorna los datos del pago parseados, o null si no corresponde a esta strategy.
   */
  handlePaymentWebhook(paymentId: string): Promise<{
    subscriptionId: string;
    data: WebhookPaymentData;
    shouldActivate: boolean;
  } | null>;

  /**
   * Procesar eventos de webhook específicos del gateway (e.g. subscription_preapproval).
   * Retorna datos para actualizar el status, o null si no aplica.
   */
  handleGatewayWebhook(eventType: string, dataId: string): Promise<{
    externalId: string;
    status: string;
    startDate?: Date;
    externalReference?: string;
  } | null>;

  /** Cancelar una suscripción. Retorna la fecha hasta la que el servicio permanece activo. */
  cancelSubscription(externalId: string | null, endDate: Date | null): Promise<CancelResult>;

  /**
   * Generar una renovación (nuevo link de pago) para suscripciones expiradas.
   * Si la strategy no soporta renovación (e.g. preapproval es automático), retorna null.
   */
  handleRenewal(data: CreatePaymentData): Promise<RenewalResult | null>;
}

export const PAYMENT_STRATEGIES = 'PAYMENT_STRATEGIES';
