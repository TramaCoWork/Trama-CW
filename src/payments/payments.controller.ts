import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserType } from '../auth/decorators/current-user.decorator';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('create')
  @ApiOperation({ summary: 'Crear un pago' })
  @ApiResponse({ status: 201, description: 'Pago creado' })
  async create(
    @CurrentUser() user: CurrentUserType,
    @Body() dto: CreatePaymentDto,
  ) {
    return this.paymentsService.create(user.userId, dto);
  }

  @Post('webhook')
  @ApiOperation({ summary: 'Webhook para notificaciones del proveedor de pagos' })
  @ApiResponse({ status: 201, description: 'Webhook procesado' })
  async handleWebhook(@Body() body: Record<string, unknown>) {
    return this.paymentsService.handleWebhook(body);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('status')
  @ApiOperation({ summary: 'Obtener estado de pagos del usuario' })
  @ApiResponse({ status: 200, description: 'Estado de pagos' })
  async getStatus(@CurrentUser() user: CurrentUserType) {
    return this.paymentsService.getStatus(user.userId);
  }
}
