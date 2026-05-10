import { Controller, Post, Body, HttpCode, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiExcludeEndpoint } from '@nestjs/swagger';
import { MercadoPagoService } from '../mercadopago/mercadopago.service';
import { SubscriptionsService } from './subscriptions.service';

@ApiTags('Subscriptions Webhook')
@Controller('subscriptions')
export class SubscriptionsWebhookController {
  private readonly logger = new Logger(SubscriptionsWebhookController.name);

  constructor(
    private readonly subscriptionsService: SubscriptionsService,
    private readonly mercadopago: MercadoPagoService,
  ) {}

  @Post('webhook')
  @HttpCode(200)
  @ApiExcludeEndpoint()
  async handleWebhook(@Body() body: any) {
    this.logger.log(`Webhook received: ${JSON.stringify(body)}`);

    const { type, data } = body;

    try {
      if (type === 'subscription_preapproval') {
        await this.handlePreapproval(data.id);
      } else if (type === 'payment') {
        await this.handlePayment(data.id);
      }
    } catch (error) {
      this.logger.error(`Webhook processing error: ${error.message}`, error.stack);
    }

    // Siempre responder 200 para que MP no reintente
    return { received: true };
  }

  private async handlePreapproval(preapprovalId: string) {
    // Verificar consultando a MP
    const preapproval = await this.mercadopago.getPreapproval(preapprovalId);
    const status = preapproval.status as string;

    this.logger.log(`Preapproval ${preapprovalId} status: ${status}`);

    const statusMap: Record<string, any> = {
      authorized: 'authorized',
      active: 'active',
      paused: 'paused',
      cancelled: 'cancelled',
    };

    const mappedStatus = statusMap[status];
    if (!mappedStatus) {
      this.logger.warn(`Unknown preapproval status: ${status}`);
      return;
    }

    const startDate = (status === 'authorized' || status === 'active') && preapproval.date_created
      ? new Date(preapproval.date_created)
      : undefined;

    await this.subscriptionsService.updateStatus(preapprovalId, mappedStatus, startDate);
  }

  private async handlePayment(paymentId: string) {
    // Verificar consultando a MP
    const payment = await this.mercadopago.getPayment(paymentId);

    // Solo procesar pagos vinculados a suscripciones
    const preapprovalId = (payment as any).metadata?.preapproval_id;
    if (!preapprovalId) {
      this.logger.log(`Payment ${paymentId} not linked to subscription, skipping`);
      return;
    }

    const status = payment.status as string;
    this.logger.log(`Payment ${paymentId} status: ${status} for preapproval: ${preapprovalId}`);

    // Extraer datos del medio de pago
    const paymentDetails = {
      paymentMethod: (payment as any).payment_type_id ?? null,       // credit_card, debit_card, account_money
      paymentMethodId: (payment as any).payment_method_id ?? null,   // visa, master, amex
      cardLastFourDigits: (payment as any).card?.last_four_digits ?? null,
      installments: (payment as any).installments ?? null,
      statusDetail: payment.status_detail ?? null,
    };

    // Raw completo para auditoría
    const rawPayment = JSON.parse(JSON.stringify(payment));

    if (status === 'approved') {
      await this.subscriptionsService.registerPayment({
        subscriptionExternalId: preapprovalId,
        paymentExternalId: paymentId,
        amount: payment.transaction_amount ?? 0,
        status: 'sub_approved',
        ...paymentDetails,
        metadata: rawPayment,
      });
    } else if (status === 'rejected' || status === 'in_process') {
      await this.subscriptionsService.registerPayment({
        subscriptionExternalId: preapprovalId,
        paymentExternalId: paymentId,
        amount: payment.transaction_amount ?? 0,
        status: 'sub_rejected',
        failureReason: payment.status_detail ?? status,
        ...paymentDetails,
        metadata: rawPayment,
      });
    }
  }
}
