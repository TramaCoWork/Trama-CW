import { Module } from '@nestjs/common';
import { CommunityService } from './community.service';
import { CommunityController } from './community.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { UploadsModule } from '../uploads/uploads.module';
import { CommunityUploadsController } from './community-uploads.controller';
import { CommunityImagesService } from './community-images.service';

@Module({
  imports: [PrismaModule, UploadsModule],
  controllers: [CommunityController, CommunityUploadsController],
  providers: [CommunityService, CommunityImagesService],
})
export class CommunityModule {}
