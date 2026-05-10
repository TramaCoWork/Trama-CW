import { Module } from '@nestjs/common';
import { DiscountsService } from './discounts.service';
import { DiscountsController } from './discounts.controller';
import { DiscountsCronService } from './discounts-cron.service';
import { MercadoPagoModule } from '../mercadopago/mercadopago.module';

@Module({
  imports: [MercadoPagoModule],
  controllers: [DiscountsController],
  providers: [DiscountsService, DiscountsCronService],
})
export class DiscountsModule {}
