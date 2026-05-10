import { Module } from '@nestjs/common';
import { ProfessionalsService } from './professionals.service';
import { ProfessionalsController } from './professionals.controller';
import { ProfessionalsCronService } from './professionals-cron.service';

@Module({
  controllers: [ProfessionalsController],
  providers: [ProfessionalsService, ProfessionalsCronService],
})
export class ProfessionalsModule {}
