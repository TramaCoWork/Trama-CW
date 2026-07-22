import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseEnumPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { NotifSourceType } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserType } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UpsertNotificationPreferenceDto } from './dto/upsert-notification-preference.dto';
import { NotificationsService } from './notifications.service';

@UseGuards(JwtAuthGuard)
@Controller('notifications/preferences')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  getPreferences(@CurrentUser() user: CurrentUserType) {
    return this.notificationsService.getPreferences(user.userId);
  }

  @Patch()
  upsertPreference(
    @CurrentUser() user: CurrentUserType,
    @Body() dto: UpsertNotificationPreferenceDto,
  ) {
    return this.notificationsService.upsertPreference(user.userId, dto);
  }

  @Delete(':sourceId/:sourceType')
  deletePreference(
    @CurrentUser() user: CurrentUserType,
    @Param('sourceId') sourceId: string,
    @Param('sourceType', new ParseEnumPipe(NotifSourceType))
    sourceType: NotifSourceType,
  ) {
    return this.notificationsService.deletePreference(
      user.userId,
      sourceId,
      sourceType,
    );
  }
}
