import { Global, Module } from '@nestjs/common';
import { DiscountsModule } from '../discounts/discounts.module';
import { MailModule } from '../mail/mail.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { ProfessionalsCronService } from './professionals-cron.service';
import { DiscountsCronService } from './discounts-cron.service';
import { SubscriptionsCronBridge } from './subscriptions-cron-bridge.service';
import { TrialReminderCronService } from './trial-reminder-cron.service';
import { DailyDigestCronService } from './daily-digest-cron.service';

@Global()
@Module({
  imports: [DiscountsModule, MailModule, SubscriptionsModule],
  providers: [
    ProfessionalsCronService,
    DiscountsCronService,
    SubscriptionsCronBridge,
    TrialReminderCronService,
    DailyDigestCronService,
  ],
  exports: [
    ProfessionalsCronService,
    DiscountsCronService,
    SubscriptionsCronBridge,
    TrialReminderCronService,
    DailyDigestCronService,
    SubscriptionsModule,
  ],
})
export class BackgroundJobsModule {}

// Traceability: implemented by @programmer at 2026-05-18 18:34:52
