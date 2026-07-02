import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  MercadoPagoConfig,
  PreApproval,
  Payment,
  Preference,
} from 'mercadopago';
import { randomUUID } from 'node:crypto';

@Injectable()
export class MercadoPagoService {
  private readonly logger = new Logger(MercadoPagoService.name);
  private client: MercadoPagoConfig | null = null;
  private preApproval: PreApproval | null = null;
  private payment: Payment | null = null;
  private preference: Preference | null = null;

  constructor(private readonly config: ConfigService) {
    const token = this.config.get<string>('MERCADOPAGO_ACCESS_TOKEN');
    if (!token) {
      this.logger.warn(
        'MERCADOPAGO_ACCESS_TOKEN no configurado. El módulo de suscripciones no estará disponible hasta que se configure.',
      );
    }
  }

  private ensureInitialized(): void {
    if (this.client) return;

    const token = this.config.get<string>('MERCADOPAGO_ACCESS_TOKEN');
    if (!token) {
      throw new Error(
        'MERCADOPAGO_ACCESS_TOKEN no está configurado. Configuralo en las variables de entorno para usar suscripciones.',
      );
    }

    this.client = new MercadoPagoConfig({ accessToken: token });
    this.preApproval = new PreApproval(this.client);
    this.payment = new Payment(this.client);
    this.preference = new Preference(this.client);

    const env = token.startsWith('TEST-')
      ? 'TEST'
      : token.startsWith('APP_USR-')
        ? 'PRODUCCIÓN'
        : 'DESCONOCIDO';
    this.logger.log(
      `MercadoPago SDK inicializado correctamente | access_token: ${token.slice(0, 8)}... (${env})`,
    );
  }

  // ─── Checkout Pro (Preference) ─────────────────────────────────────────────

  async createPreference(data: {
    title: string;
    amount: number;
    currencyId: string;
    payerEmail: string;
    backUrl: string;
    notificationUrl: string;
    externalReference: string;
  }) {
    this.ensureInitialized();

    const result = await this.preference!.create({
      body: {
        items: [
          {
            id: data.externalReference,
            title: data.title,
            quantity: 1,
            unit_price: data.amount,
            currency_id: data.currencyId,
          },
        ],
        payer: { email: data.payerEmail },
        back_urls: {
          success: `${data.backUrl}?status=success`,
          failure: `${data.backUrl}?status=failure`,
          pending: `${data.backUrl}?status=pending`,
        },
        auto_return: 'approved',
        notification_url: data.notificationUrl,
        external_reference: data.externalReference,
      } as any,
    });

    this.logger.log(
      `Preference created: ${result.id} | init_point: ${result.init_point}`,
    );
    return result;
  }

  // ─── Checkout Bricks (Payments API) ────────────────────────────────────────

  /** Devuelve la public key de MercadoPago para inicializar Bricks en el front. */
  getPublicKey(): string {
    const publicKey = this.config.get<string>('MERCADOPAGO_PUBLIC_KEY');
    if (!publicKey) {
      throw new Error(
        'MERCADOPAGO_PUBLIC_KEY no está configurado. Configuralo en las variables de entorno para usar Checkout Bricks.',
      );
    }
    return publicKey;
  }

  /**
   * Crea una orden de pago (Orders API) a partir del token generado por Checkout Bricks.
   * MP responde sincrónicamente con el estado del pago dentro de la orden.
   *
   * Se usa la Orders API (/v1/orders) y NO la legacy /v1/payments: las cuentas nuevas
   * sólo procesan tarjeta por este endpoint. El X-Idempotency-Key lo genera el backend.
   */
  async createOrderFromToken(data: {
    token: string;
    amount: number;
    installments: number;
    paymentMethodId: string;
    paymentType?: string; // credit_card | debit_card
    payerEmail: string;
    payerIdentification?: { type: string; number: string };
    externalReference: string;
  }) {
    const accessToken = this.config.get<string>('MERCADOPAGO_ACCESS_TOKEN');
    if (!accessToken)
      throw new Error('MERCADOPAGO_ACCESS_TOKEN no configurado');

    const amount = data.amount.toFixed(2);

    const payer: any = { email: data.payerEmail };
    if (data.payerIdentification) {
      payer.identification = {
        type: data.payerIdentification.type,
        number: data.payerIdentification.number,
      };
    }

    const body = {
      type: 'online',
      total_amount: amount,
      external_reference: data.externalReference,
      transactions: {
        payments: [
          {
            amount,
            payment_method: {
              id: data.paymentMethodId,
              type: data.paymentType ?? 'credit_card',
              token: data.token,
              installments: data.installments,
            },
          },
        ],
      },
      payer,
    };

    // El card token es único por intento, de un solo uso y estable ante reintentos
    // del mismo request → idempotencia real. Fallback a UUID si faltara.
    const idempotencyKey = data.token || randomUUID();
    this.logger.log(
      `Creating MP order | externalRef=${data.externalReference} | idempotencyKey=${idempotencyKey}`,
    );

    const response = await fetch('https://api.mercadopago.com/v1/orders', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify(body),
    });

    const result = await response.json();

    if (!response.ok) {
      this.logger.error(
        `MP order create failed: ${response.status} | ${JSON.stringify(result?.errors ?? result)}`,
      );
      throw new Error(
        `MercadoPago Orders API error: ${response.status} - ${JSON.stringify(result?.errors ?? result)}`,
      );
    }

    const payment = result?.transactions?.payments?.[0];
    this.logger.log(
      `MP order created: ${result.id} | payment ${payment?.id} | status ${payment?.status}/${payment?.status_detail}`,
    );
    return result;
  }

  /**
   * Crea una suscripción con cobro automático (PreApproval) a partir del card token
   * generado por Checkout Bricks. Con `card_token_id` + `status: authorized`, MP autoriza
   * y cobra automáticamente cada período SIN redirect (a diferencia de createPreapproval).
   */
  async createPreapprovalWithCardToken(data: {
    reason: string;
    cardTokenId: string;
    amount: number;
    currencyId: string;
    frequency: number;
    frequencyType: 'days' | 'months';
    trialDays?: number;
    payerEmail: string;
    externalReference: string;
    backUrl: string;
    notificationUrl: string;
  }) {
    const accessToken = this.config.get<string>('MERCADOPAGO_ACCESS_TOKEN');
    if (!accessToken)
      throw new Error('MERCADOPAGO_ACCESS_TOKEN no configurado');

    const autoRecurring: any = {
      frequency: data.frequency,
      frequency_type: data.frequencyType,
      transaction_amount: data.amount,
      currency_id: data.currencyId,
      // start_date debe ser futuro (MP rechaza fechas pasadas). Un margen chico hace que
      // el primer cobro ocurra casi de inmediato en vez de diferirse +1 período.
      start_date: new Date(Date.now() + 2 * 60 * 1000).toISOString(),
    };
    if (data.trialDays && data.trialDays > 0) {
      autoRecurring.free_trial = {
        frequency: data.trialDays,
        frequency_type: 'days',
      };
    }

    const body = {
      reason: data.reason,
      external_reference: data.externalReference,
      payer_email: data.payerEmail,
      card_token_id: data.cardTokenId,
      auto_recurring: autoRecurring,
      back_url: data.backUrl,
      notification_url: data.notificationUrl,
      status: 'authorized',
    };

    const idempotencyKey = data.cardTokenId || randomUUID();
    this.logger.log(
      `Creating MP preapproval (card token) | externalRef=${data.externalReference} | idempotencyKey=${idempotencyKey}`,
    );

    const response = await fetch('https://api.mercadopago.com/preapproval', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify(body),
    });

    const result = await response.json();

    if (!response.ok) {
      this.logger.error(
        `MP preapproval (card token) failed: ${response.status} | ${JSON.stringify(result?.errors ?? result)}`,
      );
      throw new Error(
        `MercadoPago PreApproval API error: ${response.status} - ${JSON.stringify(result?.errors ?? result)}`,
      );
    }

    this.logger.log(
      `MP preapproval created: ${result.id} | status ${result.status} | next ${result.next_payment_date}`,
    );
    return result;
  }

  // ─── Suscripciones (PreApproval) ──────────────────────────────────────────

  async createPreapprovalDirect(data: {
    reason: string;
    amount: number;
    currencyId: string;
    frequency: number;
    frequencyType: 'days' | 'months';
    trialDays?: number;
    payerEmail: string;
    backUrl: string;
    notificationUrl: string;
    externalReference: string;
  }) {
    const token = this.config.get<string>('MERCADOPAGO_ACCESS_TOKEN');
    if (!token) throw new Error('MERCADOPAGO_ACCESS_TOKEN no configurado');

    const body: any = {
      reason: data.reason,
      external_reference: data.externalReference,
      auto_recurring: {
        frequency: data.frequency,
        frequency_type: data.frequencyType,
        transaction_amount: data.amount,
        currency_id: data.currencyId,
      },
      payer_email: data.payerEmail,
      back_url: data.backUrl,
      notification_url: data.notificationUrl,
    };

    if (data.trialDays && data.trialDays > 0) {
      body.auto_recurring.free_trial = {
        frequency: data.trialDays,
        frequency_type: 'days',
      };
    }

    this.logger.log(
      `Creating preapproval (direct) with body: ${JSON.stringify(body)}`,
    );

    const response = await fetch('https://api.mercadopago.com/preapproval', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const result = await response.json();

    if (!response.ok) {
      this.logger.error(
        `MP API error: ${response.status} ${JSON.stringify(result)}`,
      );
      throw new Error(
        `MercadoPago API error: ${response.status} - ${JSON.stringify(result)}`,
      );
    }

    this.logger.log(
      `Preapproval created (direct): ${result.id} | init_point: ${result.init_point}`,
    );
    return result;
  }

  async createPreapproval(data: {
    reason: string;
    amount: number;
    currencyId: string;
    frequency: number;
    frequencyType: 'days' | 'months';
    trialDays?: number;
    payerEmail: string;
    backUrl: string;
    notificationUrl: string;
    externalReference: string;
  }) {
    this.ensureInitialized();

    const autoRecurring: any = {
      frequency: data.frequency,
      frequency_type: data.frequencyType,
      transaction_amount: data.amount,
      currency_id: data.currencyId,
    };

    if (data.trialDays && data.trialDays > 0) {
      autoRecurring.free_trial = {
        frequency: data.trialDays,
        frequency_type: 'days',
      };
    }

    const result = await this.preApproval!.create({
      body: {
        reason: data.reason,
        external_reference: data.externalReference,
        auto_recurring: autoRecurring,
        payer_email: data.payerEmail,
        back_url: data.backUrl,
        notification_url: data.notificationUrl,
      } as any,
    });

    this.logger.log(`Preapproval created: ${result.id}`);
    return result;
  }

  async cancelPreapproval(preapprovalId: string) {
    this.ensureInitialized();
    const result = await this.preApproval!.update({
      id: preapprovalId,
      body: { status: 'cancelled' },
    });
    this.logger.log(`Preapproval cancelled: ${preapprovalId}`);
    return result;
  }

  async updatePreapprovalAmount(preapprovalId: string, amount: number) {
    this.ensureInitialized();
    const result = await this.preApproval!.update({
      id: preapprovalId,
      body: {
        auto_recurring: { transaction_amount: amount },
      } as any,
    });
    this.logger.log(`Preapproval ${preapprovalId} amount updated to ${amount}`);
    return result;
  }

  async getPreapproval(preapprovalId: string) {
    this.ensureInitialized();
    return this.preApproval!.get({ id: preapprovalId });
  }

  async getPayment(paymentId: string) {
    this.ensureInitialized();
    return this.payment!.get({ id: paymentId });
  }

  /**
   * Consulta un "authorized payment" (cobro recurrente de una suscripción).
   * Es el recurso que notifica el webhook `subscription_authorized_payment` y trae
   * `preapproval_id`, el `payment` asociado (id/status) y el `transaction_amount`.
   * El SDK no lo expone, así que se consulta el endpoint REST directo.
   */
  async getAuthorizedPayment(authorizedPaymentId: string) {
    const accessToken = this.config.get<string>('MERCADOPAGO_ACCESS_TOKEN');
    if (!accessToken)
      throw new Error('MERCADOPAGO_ACCESS_TOKEN no configurado');

    const response = await fetch(
      `https://api.mercadopago.com/authorized_payments/${authorizedPaymentId}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );

    const result = await response.json();

    if (!response.ok) {
      this.logger.error(
        `MP authorized_payment fetch failed: ${response.status} | ${JSON.stringify(result?.errors ?? result)}`,
      );
      throw new Error(
        `MercadoPago authorized_payments API error: ${response.status} - ${JSON.stringify(result?.errors ?? result)}`,
      );
    }

    return result;
  }
}
