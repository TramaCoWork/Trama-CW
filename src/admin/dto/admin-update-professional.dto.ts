import { ApiPropertyOptional } from '@nestjs/swagger';
import { ProfileStatus } from '@prisma/client';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsISO8601,
  IsInt,
  IsOptional,
  IsString,
} from 'class-validator';

export class AdminUpdateProfessionalDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  photo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  document?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  whatsapp?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  pricePerHour?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  rubroId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  countryId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  provinceId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  hideProfile?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  emailVerified?: boolean;

  @ApiPropertyOptional({ enum: ProfileStatus })
  @IsOptional()
  @IsEnum(ProfileStatus)
  profileStatus?: ProfileStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsISO8601()
  trialEndDate?: string;

  @ApiPropertyOptional({ type: [Number] })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @ArrayMaxSize(5)
  professionCategoryIds?: number[];
}
