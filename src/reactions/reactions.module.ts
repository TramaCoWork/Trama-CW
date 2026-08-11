import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { EntitlementsModule } from '../entitlements/entitlements.module';
import { CommunityModule } from '../community/community.module';
import { ReactionsQueryModule } from './reactions-query.module';
import { ReactionsService } from './reactions.service';
import { ReactionsController } from './reactions.controller';

@Module({
  imports: [PrismaModule, EntitlementsModule, CommunityModule, ReactionsQueryModule],
  controllers: [ReactionsController],
  providers: [ReactionsService],
})
export class ReactionsModule {}
