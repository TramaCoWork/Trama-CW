import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MercadoPagoConfig, PreApproval, Payment, Preference } from 'mercadopago';

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
    this.logger.log('MercadoPago SDK inicializado correctamente');
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

    this.logger.log(`Preference created: ${result.id} | init_point: ${result.init_point}`);
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

    this.logger.log(`Creating preapproval (direct) with body: ${JSON.stringify(body)}`);

    const response = await fetch('https://api.mercadopago.com/preapproval', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const result = await response.json();

    if (!response.ok) {
      this.logger.error(`MP API error: ${response.status} ${JSON.stringify(result)}`);
      throw new Error(`MercadoPago API error: ${response.status} - ${JSON.stringify(result)}`);
    }

    this.logger.log(`Preapproval created (direct): ${result.id} | init_point: ${result.init_point}`);
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
}
