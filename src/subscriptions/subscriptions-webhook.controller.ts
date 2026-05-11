import { Controller, Post, Body, HttpCode, Logger } from '@nestjs/common';
import { ApiTags, ApiExcludeEndpoint } from '@nestjs/swagger';
import { SubscriptionsService } from './subscriptions.service';
import { PaymentStrategyFactory } from './strategies/payment-strategy.factory';

@ApiTags('Subscriptions Webhook')
@Controller('subscriptions')
export class SubscriptionsWebhookController {
  private readonly logger = new Logger(SubscriptionsWebhookController.name);

  constructor(
    private readonly subscriptionsService: SubscriptionsService,
    private readonly strategyFactory: PaymentStrategyFactory,
  ) {}

  @Post('webhook')
  @HttpCode(200)
  @ApiExcludeEndpoint()
  async handleWebhook(@Body() body: any) {
    this.logger.log(`Webhook received: ${JSON.stringify(body)}`);

    const { type, data } = body;

    try {
      if (type === 'payment') {
        await this.handlePayment(data.id);
      } else {
        // Eventos de gateway (subscription_preapproval, etc.)
        await this.handleGatewayEvent(type, data.id);
      }
    } catch (error) {
      this.logger.error(`Webhook processing error: ${error.message}`, error.stack);
    }

    // Siempre responder 200 para que MP no reintente
    return { received: true };
  }

  private async handleGatewayEvent(eventType: string, dataId: string) {
    // Intentar con cada strategy hasta que una lo maneje
    for (const strategy of this.strategyFactory.getAllStrategies()) {
      const result = await strategy.handleGatewayWebhook(eventType, dataId);
      if (result) {
        await this.subscriptionsService.updateStatus(
          result.externalId,
          result.status as any,
          result.startDate,
          result.externalReference,
        );
        return;
      }
    }

    this.logger.log(`No strategy handled gateway event: ${eventType} / ${dataId}`);
  }

  private async handlePayment(paymentId: string) {
    // Intentar con cada strategy hasta que una lo maneje
    for (const strategy of this.strategyFactory.getAllStrategies()) {
      const result = await strategy.handlePaymentWebhook(paymentId);
      if (result) {
        const { subscriptionId, data, shouldActivate } = result;

        // Si el subscriptionId tiene prefijo "ext:", buscar por externalId
        if (subscriptionId.startsWith('ext:')) {
          const externalId = subscriptionId.slice(4);
          await this.subscriptionsService.registerPayment({
            subscriptionExternalId: externalId,
            ...data,
          });
        } else if (shouldActivate && data.status === 'sub_approved') {
          await this.subscriptionsService.activateFromCheckoutPayment(subscriptionId, data);
        } else {
          await this.subscriptionsService.registerPaymentBySubscriptionId(subscriptionId, data);
        }
        return;
      }
    }

    this.logger.log(`No strategy handled payment: ${paymentId}`);
  }
}
