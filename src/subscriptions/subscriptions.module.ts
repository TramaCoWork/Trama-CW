import { Module } from '@nestjs/common';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsWebhookController } from './subscriptions-webhook.controller';
import { SubscriptionsService } from './subscriptions.service';
import { PrismaModule } from '../prisma/prisma.module';
import { MercadoPagoModule } from '../mercadopago/mercadopago.module';
import { SubscriptionPlansModule } from '../subscription-plans/subscription-plans.module';

@Module({
  imports: [PrismaModule, MercadoPagoModule, SubscriptionPlansModule],
  controllers: [SubscriptionsController, SubscriptionsWebhookController],
  providers: [SubscriptionsService],
})
export class SubscriptionsModule {}
