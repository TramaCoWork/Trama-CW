import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserType } from '../auth/decorators/current-user.decorator';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @UseGuards(JwtAuthGuard)
  @Post('create')
  async create(
    @CurrentUser() user: CurrentUserType,
    @Body() dto: CreatePaymentDto,
  ) {
    return this.paymentsService.create(user.userId, dto);
  }

  @Post('webhook')
  async handleWebhook(@Body() body: Record<string, unknown>) {
    return this.paymentsService.handleWebhook(body);
  }

  @UseGuards(JwtAuthGuard)
  @Get('status')
  async getStatus(@CurrentUser() user: CurrentUserType) {
    return this.paymentsService.getStatus(user.userId);
  }
}
