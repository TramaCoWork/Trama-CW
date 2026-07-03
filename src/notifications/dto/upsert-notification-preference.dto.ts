import { NotifSourceType } from '@prisma/client';
import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpsertNotificationPreferenceDto {
  @IsString()
  @IsNotEmpty()
  sourceId: string;

  @IsEnum(NotifSourceType)
  sourceType: NotifSourceType;

  @IsOptional()
  @IsBoolean()
  email?: boolean;

  @IsOptional()
  @IsBoolean()
  push?: boolean;
}
