import { IsString, IsNumber, IsOptional, IsEnum, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FrequencyType } from '@prisma/client';

export class CreatePlanDto {
  @ApiProperty({ example: 'Plan Mensual Coworking' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Acceso mensual al espacio de coworking' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 15000 })
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiPropertyOptional({ default: 'ARS' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ default: 1, example: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  frequency?: number;

  @ApiPropertyOptional({ enum: FrequencyType, default: 'months' })
  @IsOptional()
  @IsEnum(FrequencyType)
  frequencyType?: FrequencyType;

  @ApiPropertyOptional({ default: 0, example: 7, description: 'Días de prueba gratis (0 = sin trial)' })
  @IsOptional()
  @IsInt()
  @Min(0)
  trialDays?: number;
}
