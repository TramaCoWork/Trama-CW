import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { OneSignalService } from './onesignal.service';
import { PushNotificationsService } from './push-notifications.service';

@Module({
  imports: [PrismaModule],
  providers: [OneSignalService, PushNotificationsService],
  exports: [OneSignalService, PushNotificationsService],
})
export class OneSignalModule {}
