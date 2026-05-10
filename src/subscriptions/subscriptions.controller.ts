import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Query,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { SubscriptionsService } from './subscriptions.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserType } from '../auth/decorators/current-user.decorator';

@ApiTags('Subscriptions')
@ApiBearerAuth()
@Controller('subscriptions')
@UseGuards(JwtAuthGuard)
export class SubscriptionsController {
  constructor(private readonly service: SubscriptionsService) {}

  @Post()
  @ApiOperation({ summary: 'Crear suscripción (devuelve init_point de MP)' })
  create(
    @CurrentUser() user: CurrentUserType,
    @Body(ValidationPipe) dto: CreateSubscriptionDto,
  ) {
    return this.service.create(user.userId, dto);
  }

  @Get('me')
  @ApiOperation({ summary: 'Mi suscripción activa' })
  findMine(@CurrentUser() user: CurrentUserType) {
    return this.service.findMySubscription(user.userId);
  }

  @Get('me/payments')
  @ApiOperation({ summary: 'Mi historial de pagos de suscripción (paginado)' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Página actual (default: 1)' })
  @ApiQuery({ name: 'sizePage', required: false, type: Number, description: 'Resultados por página (default: 10)' })
  findMyPayments(
    @CurrentUser() user: CurrentUserType,
    @Query('page') page = 1,
    @Query('sizePage') sizePage = 10,
  ) {
    return this.service.findMyPayments(user.userId, Number(page), Number(sizePage));
  }

  @Patch('me/cancel')
  @ApiOperation({ summary: 'Cancelar mi suscripción' })
  cancel(@CurrentUser() user: CurrentUserType) {
    return this.service.cancel(user.userId);
  }
}
