import { Module } from '@nestjs/common';
import { DiscountsModule } from '../discounts/discounts.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { ProfessionalsCronService } from './professionals-cron.service';
import { DiscountsCronService } from './discounts-cron.service';
import { SubscriptionsCronBridge } from './subscriptions-cron-bridge.service';

@Module({
  imports: [DiscountsModule, SubscriptionsModule],
  providers: [ProfessionalsCronService, DiscountsCronService, SubscriptionsCronBridge],
})
export class BackgroundJobsModule {}

// Traceability: implemented by @programmer at 2026-05-18 18:34:52
