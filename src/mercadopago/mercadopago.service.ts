import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MercadoPagoConfig, PreApproval, Payment } from 'mercadopago';

@Injectable()
export class MercadoPagoService {
  private readonly logger = new Logger(MercadoPagoService.name);
  private client: MercadoPagoConfig | null = null;
  private preApproval: PreApproval | null = null;
  private payment: Payment | null = null;

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
    this.logger.log('MercadoPago SDK inicializado correctamente');
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
