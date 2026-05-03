import { Module } from '@nestjs/common';
import { ProfessionCategoriesController } from './profession-categories.controller';
import { ProfessionCategoriesService } from './profession-categories.service';

@Module({
  controllers: [ProfessionCategoriesController],
  providers: [ProfessionCategoriesService],
  exports: [ProfessionCategoriesService],
})
export class ProfessionCategoriesModule {}
