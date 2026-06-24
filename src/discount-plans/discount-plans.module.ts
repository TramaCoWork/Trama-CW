import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { DiscountPlansController } from './discount-plans.controller';
import { DiscountPlansService } from './discount-plans.service';

@Module({
  imports: [PrismaModule],
  controllers: [DiscountPlansController],
  providers: [DiscountPlansService],
  exports: [DiscountPlansService],
})
export class DiscountPlansModule {}
