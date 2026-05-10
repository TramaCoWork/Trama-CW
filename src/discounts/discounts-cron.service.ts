import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DiscountsService } from './discounts.service';

@Injectable()
export class DiscountsCronService {
  private readonly logger = new Logger(DiscountsCronService.name);

  constructor(private readonly discountsService: DiscountsService) {}

  // Aplicar descuentos pendientes - todos los días a la 01:00
  @Cron('0 1 * * *')
  async handleApplyDiscounts() {
    this.logger.log('Running discount apply job...');
    const count = await this.discountsService.applyPendingDiscounts();
    if (count > 0) {
      this.logger.log(`Processed ${count} pending discounts`);
    }
  }

  // Restaurar montos originales - todos los días a las 02:00
  @Cron('0 2 * * *')
  async handleRestoreDiscounts() {
    this.logger.log('Running discount restore job...');
    const count = await this.discountsService.restoreExpiredDiscounts();
    if (count > 0) {
      this.logger.log(`Restored ${count} expired discounts`);
    }
  }
}
