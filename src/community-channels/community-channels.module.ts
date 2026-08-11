import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { OneSignalModule } from '../onesignal/onesignal.module';
import { ReactionsQueryModule } from '../reactions/reactions-query.module';
import { CommunityChannelsController } from './community-channels.controller';
import { CommunityChannelsService } from './community-channels.service';
import { ChannelMemberGuard } from './guards/channel-member.guard';

@Module({
  imports: [PrismaModule, OneSignalModule, ReactionsQueryModule],
  controllers: [CommunityChannelsController],
  providers: [CommunityChannelsService, ChannelMemberGuard],
})
export class CommunityChannelsModule {}
