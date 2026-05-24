import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { WinstonModule } from 'nest-winston';
import * as Joi from 'joi';
import { createWinstonConfig } from './common/logger/winston.config';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { ProfessionalsModule } from './professionals/professionals.module';
import { SearchModule } from './search/search.module';
import { PaymentsModule } from './payments/payments.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { OnboardingModule } from './onboarding/onboarding.module';
import { ContactsModule } from './contacts/contacts.module';
import { CommunityModule } from './community/community.module';
import { JobsModule } from './jobs/jobs.module';
import { AdminModule } from './admin/admin.module';
import { ProfessionCategoriesModule } from './profession-categories/profession-categories.module';
import { UploadsModule } from './uploads/uploads.module';
import { MailModule } from './mail/mail.module';
import { MercadoPagoModule } from './mercadopago/mercadopago.module';
import { SubscriptionPlansModule } from './subscription-plans/subscription-plans.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { LocationsModule } from './locations/locations.module';
import { CatalogsModule } from './catalogs/catalogs.module';
import { DiscountsModule } from './discounts/discounts.module';
import { BackgroundJobsModule } from './background-jobs/background-jobs.module';
import { ContactModule } from './contact/contact.module';
import { MessagesModule } from './messages/messages.module';
import { UsersModule } from './users/users.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        DATABASE_URL: Joi.string().required(),
        JWT_SECRET: Joi.string().required(),
        JWT_EXPIRES_IN: Joi.string().default('7d'),
        PORT: Joi.number().default(3000),
        NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
        MAIL_PROVIDER: Joi.string().valid('smtp', 'gmail').optional(),
        MAIL_FROM: Joi.string().optional(),
        SMTP_HOST: Joi.string().optional(),
        SMTP_PORT: Joi.number().optional(),
        SMTP_SECURE: Joi.string().optional(),
        SMTP_USER: Joi.string().optional(),
        SMTP_PASS: Joi.string().optional(),
        GMAIL_USER: Joi.string().optional(),
        GMAIL_APP_PASSWORD: Joi.string().optional(),
        MERCADOPAGO_ACCESS_TOKEN: Joi.string().optional(),
        SUBSCRIPTION_NOTIFICATION_URL: Joi.string().optional(),
        TRIAL_DAYS: Joi.number().default(0),
        PAYMENT_MODE: Joi.string().valid('subscription', 'checkout').default('subscription'),
        CRON_SCHEDULE: Joi.string()
          .custom((value, helpers) => {
            if (!value) return value;
            try {
              const parsed = JSON.parse(value);
              if (typeof parsed !== 'object' || Array.isArray(parsed)) {
                return helpers.error('any.invalid', { message: 'must be a JSON object' });
              }
              for (const [key, val] of Object.entries(parsed)) {
                if (val !== null && typeof val !== 'string') {
                  return helpers.error('any.invalid', { message: `value for "${key}" must be a string or null` });
                }
              }
              return value;
            } catch {
              return helpers.error('any.invalid', { message: 'must be valid JSON' });
            }
          })
          .default(
            '{"expiredTrials":"0 0 * * *","expiredCancelledSubs":"0 0 * * *","subscriptionRenewals":"0 0 * * *","applyDiscounts":"0 1 * * *","restoreDiscounts":"0 2 * * *"}',
          ),
        LOG_RETENTION_DAYS: Joi.number().default(90),
        UPLOAD_PATH: Joi.string()
          .trim()
          .pattern(/^(?!.*\.\.)(?![A-Za-z]:[\\/])(?![\\/]).+$/)
          .default('uploads')
          .messages({
            'string.pattern.base': 'UPLOAD_PATH must be a non-empty relative path without .. segments',
          }),
        SUPPORT_EMAIL: Joi.string().optional(),
        TURNSTILE_SECRET_KEY: Joi.string().optional(),
      }),
    }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 60 }]),
    ScheduleModule.forRoot(),
    WinstonModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const retentionDays = config.get<number>('LOG_RETENTION_DAYS', 90);
        return createWinstonConfig(retentionDays);
      },
    }),
    PrismaModule,
    AuthModule,
    ProfessionalsModule,
    SearchModule,
    PaymentsModule,
    DashboardModule,
    OnboardingModule,
    ContactsModule,
    CommunityModule,
    JobsModule,
    AdminModule,
    ProfessionCategoriesModule,
    UploadsModule,
    MailModule,
    MercadoPagoModule,
    SubscriptionPlansModule,
    SubscriptionsModule,
    LocationsModule,
    CatalogsModule,
    DiscountsModule,
    BackgroundJobsModule,
    ContactModule,
    MessagesModule,
    UsersModule,
  ],
  controllers: [AppController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
  ],
})
export class AppModule {}
