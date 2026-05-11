import { Module } from '@nestjs/common';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsWebhookController } from './subscriptions-webhook.controller';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionsCronService } from './subscriptions-cron.service';
import { PaymentStrategyFactory } from './strategies/payment-strategy.factory';
import { MpCheckoutStrategy } from './strategies/mp-checkout.strategy';
import { MpSubscriptionStrategy } from './strategies/mp-subscription.strategy';
import { PAYMENT_STRATEGIES } from './strategies/payment-strategy.interface';
import { PrismaModule } from '../prisma/prisma.module';
import { MercadoPagoModule } from '../mercadopago/mercadopago.module';
import { SubscriptionPlansModule } from '../subscription-plans/subscription-plans.module';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [PrismaModule, MercadoPagoModule, SubscriptionPlansModule, MailModule],
  controllers: [SubscriptionsController, SubscriptionsWebhookController],
  providers: [
    SubscriptionsService,
    SubscriptionsCronService,
    MpCheckoutStrategy,
    MpSubscriptionStrategy,
    {
      provide: PAYMENT_STRATEGIES,
      useFactory: (mpCheckout: MpCheckoutStrategy, mpSubscription: MpSubscriptionStrategy) => [
        mpCheckout,
        mpSubscription,
      ],
      inject: [MpCheckoutStrategy, MpSubscriptionStrategy],
    },
    PaymentStrategyFactory,
  ],
})
export class SubscriptionsModule {}
