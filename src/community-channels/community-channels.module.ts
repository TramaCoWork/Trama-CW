import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CommunityChannelsController } from './community-channels.controller';
import { CommunityChannelsService } from './community-channels.service';
import { ChannelMemberGuard } from './guards/channel-member.guard';

@Module({
  imports: [PrismaModule],
  controllers: [CommunityChannelsController],
  providers: [CommunityChannelsService, ChannelMemberGuard],
})
export class CommunityChannelsModule {}
