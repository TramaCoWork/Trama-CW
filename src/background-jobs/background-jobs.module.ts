import { Global, Module } from '@nestjs/common';
import { DiscountsModule } from '../discounts/discounts.module';
import { MailModule } from '../mail/mail.module';
import { MercadoPagoModule } from '../mercadopago/mercadopago.module';
import { SubscriptionsModule } from '../subscriptions/subscriptions.module';
import { ProfessionalsCronService } from './professionals-cron.service';
import { DiscountsCronService } from './discounts-cron.service';
import { SubscriptionsCronBridge } from './subscriptions-cron-bridge.service';
import { SubscriptionRenewPreapprovalCronService } from './subscription-renew-preapproval-cron.service';
import { TrialReminderCronService } from './trial-reminder-cron.service';
import { DailyDigestCronService } from './daily-digest-cron.service';
import { OnboardingReminderCronService } from './onboarding-reminder-cron.service';

@Global()
@Module({
  imports: [DiscountsModule, MailModule, MercadoPagoModule, SubscriptionsModule],
  providers: [
    ProfessionalsCronService,
    DiscountsCronService,
    SubscriptionsCronBridge,
    SubscriptionRenewPreapprovalCronService,
    TrialReminderCronService,
    DailyDigestCronService,
    OnboardingReminderCronService,
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
