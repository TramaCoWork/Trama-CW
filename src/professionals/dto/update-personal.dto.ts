import { IsString, IsOptional, IsEnum, IsNumber, IsDateString, IsInt } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WorkModality } from '@prisma/client';

export class UpdatePersonalDto {
  @ApiPropertyOptional({ example: 'Ana García', description: 'Nombre completo' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: '12345678', description: 'DNI o Pasaporte' })
  @IsOptional()
  @IsString()
  dni?: string;

  @ApiPropertyOptional({ example: '1990-05-15', description: 'Fecha de nacimiento (ISO)' })
  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @ApiPropertyOptional({ example: 'https://linkedin.com/in/ana-garcia', description: 'Perfil de LinkedIn' })
  @IsOptional()
  @IsString()
  linkedin?: string;

  @ApiPropertyOptional({ example: '+5491112345678', description: 'Numero de WhatsApp' })
  @IsOptional()
  @IsString()
  whatsapp?: string;

  @ApiPropertyOptional({ example: 'Buenos Aires', description: 'Ciudad de residencia (texto libre)' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: 1, description: 'ID del país' })
  @IsOptional()
  @IsInt()
  countryId?: number;

  @ApiPropertyOptional({ example: 1, description: 'ID de la provincia' })
  @IsOptional()
  @IsInt()
  provinceId?: number;

  @ApiPropertyOptional({ example: '50.00', description: 'Precio por hora' })
  @IsOptional()
  @IsString()
  pricePerHour?: string;

  @ApiPropertyOptional({ enum: WorkModality, description: 'Modalidad de trabajo' })
  @IsOptional()
  @IsEnum(WorkModality)
  workModality?: WorkModality;
}
