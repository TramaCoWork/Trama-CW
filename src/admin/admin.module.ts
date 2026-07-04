import { Module } from '@nestjs/common';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { AdminCommunityController } from './admin-community.controller';
import { AdminCommunityService } from './admin-community.service';
import { AdminChannelsController } from './admin-channels.controller';
import { AdminChannelsService } from './admin-channels.service';
import { AdminJobsController } from './admin-jobs.controller';
import { AdminJobsService } from './admin-jobs.service';
import { PrismaModule } from '../prisma/prisma.module';
import { MailModule } from '../mail/mail.module';
import { AuthModule } from '../auth/auth.module';
import { UploadsModule } from '../uploads/uploads.module';
import { MercadoPagoModule } from '../mercadopago/mercadopago.module';
import { CommunityService } from '../community/community.service';
import { BackgroundJobsModule } from '../background-jobs/background-jobs.module';

@Module({
  imports: [
    PrismaModule,
    MailModule,
    AuthModule,
    UploadsModule,
    MercadoPagoModule,
    BackgroundJobsModule,
  ],
  controllers: [
    AdminController,
    AdminCommunityController,
    AdminChannelsController,
    AdminJobsController,
  ],
  providers: [
    AdminService,
    AdminCommunityService,
    AdminChannelsService,
    AdminJobsService,
    CommunityService,
  ],
})
export class AdminModule {}
