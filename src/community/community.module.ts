import { Module } from '@nestjs/common';
import { CommunityService } from './community.service';
import { CommunityController } from './community.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { UploadsModule } from '../uploads/uploads.module';
import { CommunityUploadsController } from './community-uploads.controller';
import { CommunityImagesService } from './community-images.service';
import { ReactionsQueryModule } from '../reactions/reactions-query.module';

@Module({
  imports: [PrismaModule, UploadsModule, ReactionsQueryModule],
  controllers: [CommunityController, CommunityUploadsController],
  providers: [CommunityService, CommunityImagesService],
  exports: [CommunityService],
})
export class CommunityModule {}
