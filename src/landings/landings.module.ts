import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { LandingsController } from './landings.controller';
import { LandingsService } from './landings.service';

@Module({
  imports: [PrismaModule],
  controllers: [LandingsController],
  providers: [LandingsService],
  exports: [LandingsService],
})
export class LandingsModule {}
