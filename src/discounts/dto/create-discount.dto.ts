import {
  IsOptional,
  IsNumber,
  IsUUID,
  IsString,
  IsDateString,
  Min,
  ValidateIf,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDiscountDto {
  @ApiProperty({ description: 'ID del perfil profesional' })
  @IsUUID()
  professionalId: string;

  @ApiPropertyOptional({
    example: 20,
    description: 'Porcentaje de descuento (ej: 20 = 20%)',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  percentage?: number;

  @ApiPropertyOptional({
    example: 2000,
    description: 'Monto fijo de descuento',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  fixedAmount?: number;

  @ApiProperty({
    example: '2026-06-01',
    description: 'Fecha de inicio del descuento',
  })
  @IsDateString()
  startDate: string;

  @ApiProperty({
    example: '2026-06-30',
    description: 'Fecha de fin del descuento',
  })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({
    example: 'Descuento por promo de lanzamiento',
    description: 'Notas internas',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
