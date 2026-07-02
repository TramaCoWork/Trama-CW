import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class CreateDiscountPlanDto {
  @ApiProperty({ description: 'ID del plan de suscripción' })
  @IsUUID()
  subscriptionPlanId: string;

  @ApiProperty({ example: 2500, description: 'Monto fijo de descuento' })
  @IsNumber()
  @Min(0)
  discountAmount: number;

  @ApiPropertyOptional({ description: 'Descripción interna del descuento' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    default: true,
    description: 'Activa o desactiva manualmente el plan',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({
    example: '2026-07-01T00:00:00.000Z',
    description: 'Fecha de inicio de vigencia',
  })
  @IsDateString()
  fromDate: string;

  @ApiProperty({
    example: '2026-07-31T23:59:59.999Z',
    description: 'Fecha de fin de vigencia',
  })
  @IsDateString()
  toDate: string;

  @ApiPropertyOptional({
    description: 'Cantidad de ciclos de facturación a aplicar',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  billingCycles?: number;

  @ApiPropertyOptional({ description: 'Cantidad máxima total de usos' })
  @IsOptional()
  @IsInt()
  maxUses?: number;

  @ApiPropertyOptional({ description: 'Cantidad máxima de usos por usuario' })
  @IsOptional()
  @IsInt()
  perUserLimit?: number;
}
