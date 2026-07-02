import {
  Controller,
  Post,
  Body,
  Query,
  Headers,
  HttpCode,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiExcludeEndpoint } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { SubscriptionsService } from './subscriptions.service';
import { PaymentStrategyFactory } from './strategies/payment-strategy.factory';
import { PrismaService } from '../prisma/prisma.service';
import { MercadoPagoService } from '../mercadopago/mercadopago.service';

@ApiTags('Subscriptions Webhook')
@Controller('subscriptions')
export class SubscriptionsWebhookController {
  private readonly logger = new Logger(SubscriptionsWebhookController.name);

  constructor(
    private readonly subscriptionsService: SubscriptionsService,
    private readonly strategyFactory: PaymentStrategyFactory,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly mercadopago: MercadoPagoService,
  ) {}

  @Post('webhook')
  @HttpCode(200)
  @ApiExcludeEndpoint()
  async handleWebhook(
    @Body() body: any,
    @Query() query: any,
    @Headers('x-signature') xSignature?: string,
    @Headers('x-request-id') xRequestId?: string,
  ) {
    // MP manda data.id tanto en el body como en query (?data.id=...)
    const eventType: string | undefined = body?.type ?? query?.type;
    const resourceId: string | undefined = body?.data?.id ?? query?.['data.id'];
    // MP firma sobre el data.id del query string
    const signatureDataId: string | undefined =
      query?.['data.id'] ?? body?.data?.id;

    // Validar autenticidad del webhook (si hay secret configurado)
    if (!this.isValidSignature(xSignature, xRequestId, signatureDataId)) {
      this.logger.warn(
        `Webhook rechazado: firma inválida (resourceId=${resourceId})`,
      );
      await this.persistEvent(
        eventType,
        resourceId,
        'rejected',
        'invalid_signature',
        body,
      );
      throw new UnauthorizedException('Invalid webhook signature');
    }

    this.logger.log(`Webhook received: ${JSON.stringify(body)}`);

    const webhookEventId = await this.persistEvent(
      eventType,
      resourceId,
      'processed',
      undefined,
      body,
    );

    try {
      if (eventType === 'payment') {
        await this.handlePayment(resourceId, webhookEventId ?? undefined);
      } else if (eventType === 'subscription_authorized_payment') {
        await this.handleAuthorizedPayment(
          resourceId,
          webhookEventId ?? undefined,
        );
      } else {
        await this.handleGatewayEvent(eventType, resourceId);
      }
    } catch (error) {
      const errorMsg = error?.message ?? String(error);
      this.logger.error(`Webhook processing error: ${errorMsg}`, error?.stack);

      if (webhookEventId) {
        await this.prisma.webhookEvent
          .update({
            where: { id: webhookEventId },
            data: { status: 'failed', error: errorMsg },
          })
          .catch((updateError) =>
            this.logger.error(
              `Failed to mark webhook event ${webhookEventId} as failed: ${updateError.message}`,
            ),
          );
      }
    }

    // Siempre responder 200 para que MP no reintente
    return { received: true };
  }

  /**
   * Valida el header x-signature de MercadoPago (HMAC-SHA256).
   * Si MERCADOPAGO_WEBHOOK_SECRET no está configurado, no valida (modo dev).
   */
  private isValidSignature(
    xSignature?: string,
    xRequestId?: string,
    dataId?: string,
  ): boolean {
    const secret = this.config.get<string>('MERCADOPAGO_WEBHOOK_SECRET');
    if (!secret) return true; // sin secret → no se valida (dev)
    if (!xSignature) return false;

    // x-signature: "ts=1700000000,v1=abc123..."
    const parts: Record<string, string> = {};
    for (const segment of xSignature.split(',')) {
      const [k, v] = segment.split('=');
      if (k && v) parts[k.trim()] = v.trim();
    }
    const ts = parts['ts'];
    const v1 = parts['v1'];
    if (!ts || !v1) return false;

    // data.id alfanumérico → minúsculas (spec de MP)
    const id = (dataId ?? '').toLowerCase();
    const manifest = `id:${id};request-id:${xRequestId ?? ''};ts:${ts};`;
    const computed = createHmac('sha256', secret)
      .update(manifest)
      .digest('hex');

    try {
      return timingSafeEqual(Buffer.from(computed), Buffer.from(v1));
    } catch {
      return false; // longitudes distintas, etc.
    }
  }

  private async persistEvent(
    eventType: string | undefined,
    resourceId: string | undefined,
    status: string,
    error: string | undefined,
    payload: any,
  ): Promise<string | null> {
    try {
      const createdEvent = await this.prisma.webhookEvent.create({
        data: {
          provider: 'mercadopago',
          eventType: eventType ?? null,
          resourceId: resourceId ?? null,
          status,
          error: error ?? null,
          payload: payload ?? undefined,
        },
        select: { id: true },
      });

      return createdEvent.id;
    } catch (e) {
      this.logger.error(`Failed to persist webhook event: ${e.message}`);
      return null;
    }
  }

  /** @returns true si alguna strategy manejó el evento */
  private async handleGatewayEvent(
    eventType?: string,
    dataId?: string,
  ): Promise<boolean> {
    if (!eventType || !dataId) return false;

    for (const strategy of this.strategyFactory.getAllStrategies()) {
      const result = await strategy.handleGatewayWebhook(eventType, dataId);
      if (result) {
        await this.subscriptionsService.updateStatus(
          result.externalId,
          result.status as any,
          result.startDate,
          result.externalReference,
        );
        return true;
      }
    }

    this.logger.log(
      `No strategy handled gateway event: ${eventType} / ${dataId}`,
    );
    return false;
  }

  /**
   * Cobro recurrente real de una suscripción (evento `subscription_authorized_payment`).
   * El `data.id` es un authorized_payment; lo consultamos para obtener el `preapproval_id`
   * (= externalId de nuestra suscripción) y el pago concreto, y lo registramos.
   * @returns true si se registró un pago concreto
   */
  private async handleAuthorizedPayment(
    authorizedPaymentId?: string,
    webhookEventId?: string,
  ): Promise<boolean> {
    if (!authorizedPaymentId) return false;

    const ap: any =
      await this.mercadopago.getAuthorizedPayment(authorizedPaymentId);
    const preapprovalId: string | undefined = ap?.preapproval_id;
    const payment = ap?.payment;

    // Si todavía no hay un pago concreto asociado (e.g. status "scheduled"), no hay nada que registrar.
    if (!preapprovalId || !payment?.id) {
      this.logger.log(
        `Authorized payment ${authorizedPaymentId} sin pago concreto aún (preapproval=${preapprovalId ?? 'none'}, status=${ap?.status ?? 'none'})`,
      );
      return false;
    }

    const status = payment.status as string;
    await this.subscriptionsService.registerPayment({
      subscriptionExternalId: preapprovalId,
      paymentExternalId: String(payment.id),
      webhookEventId,
      amount: ap.transaction_amount ?? payment.transaction_amount ?? 0,
      status: status === 'approved' ? 'sub_approved' : 'sub_rejected',
      failureReason:
        status !== 'approved' ? (payment.status_detail ?? status) : undefined,
      statusDetail: payment.status_detail ?? null,
      metadata: ap,
    });
    return true;
  }

  /** @returns true si alguna strategy manejó el pago */
  private async handlePayment(
    paymentId?: string,
    webhookEventId?: string,
  ): Promise<boolean> {
    if (!paymentId) return false;

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
            webhookEventId,
          });
        } else if (shouldActivate && data.status === 'sub_approved') {
          await this.subscriptionsService.activateFromCheckoutPayment(
            subscriptionId,
            data,
            webhookEventId,
          );
        } else {
          await this.subscriptionsService.registerPaymentBySubscriptionId(
            subscriptionId,
            {
              ...data,
              webhookEventId,
            },
          );
        }
        return true;
      }
    }

    this.logger.log(`No strategy handled payment: ${paymentId}`);
    return false;
  }
}
