import {
  Body,
  Controller,
  Delete,
  Param,
  Post,
  Query,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserType } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RegisterPushSubscriptionDto } from './dto/register-push-subscription.dto';
import { PushService } from './push.service';

@ApiTags('Push')
@ApiBearerAuth()
@Controller('push/subscriptions')
@UseGuards(JwtAuthGuard)
export class PushController {
  constructor(private readonly pushService: PushService) {}

  @Post()
  @ApiOperation({
    summary:
      'Registrar o actualizar el UUID de push del usuario autenticado (guarda o actualiza).',
  })
  @ApiResponse({ status: 201, description: 'Suscripcion registrada/actualizada' })
  @ApiResponse({ status: 400, description: 'Payload invalido' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  register(
    @CurrentUser() user: CurrentUserType,
    @Body(new ValidationPipe({ whitelist: true, transform: true }))
    dto: RegisterPushSubscriptionDto,
  ) {
    return this.pushService.registerSubscription(user.userId, dto);
  }

  @Delete(':subscriptionId')
  @ApiOperation({
    summary:
      'Eliminar el UUID de push del usuario autenticado (ej. logout). Idempotente.',
  })
  @ApiParam({
    name: 'subscriptionId',
    description: 'UUID de la suscripcion a eliminar',
  })
  @ApiQuery({
    name: 'provider',
    required: false,
    description: 'Proveedor de push. Default: "onesignal"',
  })
  @ApiResponse({
    status: 200,
    description: 'Suscripcion eliminada (o inexistente): { ok, deleted }',
  })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  remove(
    @CurrentUser() user: CurrentUserType,
    @Param('subscriptionId') subscriptionId: string,
    @Query('provider') provider?: string,
  ) {
    return this.pushService.deleteSubscription(
      user.userId,
      subscriptionId,
      provider,
    );
  }
}
