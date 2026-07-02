import { Module } from '@nestjs/common';
import { AdminProfessionCategoriesController } from './admin-profession-categories.controller';
import { ProfessionCategoriesController } from './profession-categories.controller';
import { ProfessionCategoriesService } from './profession-categories.service';

@Module({
  controllers: [
    ProfessionCategoriesController,
    AdminProfessionCategoriesController,
  ],
  providers: [ProfessionCategoriesService],
  exports: [ProfessionCategoriesService],
})
export class ProfessionCategoriesModule {}
