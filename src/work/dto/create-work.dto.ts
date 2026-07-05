import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { JobStatus } from '@prisma/client';
import {
  IsArray,
  IsEmail,
  IsEnum,
  IsISO8601,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateWorkDto {
  @ApiProperty({
    example: 'Diseñador UX para startup',
    description: 'Titulo del trabajo',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    example: 'Buscamos diseñador UX con experiencia en apps moviles',
    description: 'Descripcion del trabajo',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({
    example: 'busquedas@empresa.com',
    description: 'Email de contacto para postulaciones',
  })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({
    enum: JobStatus,
    example: JobStatus.active,
    description: 'Estado de la vacante',
  })
  @IsOptional()
  @IsEnum(JobStatus)
  status?: JobStatus;

  @ApiPropertyOptional({
    example: '2026-07-04T10:00:00.000Z',
    description: 'Fecha/hora desde la que la vacante es visible',
  })
  @IsOptional()
  @IsISO8601()
  validFrom?: string;

  @ApiPropertyOptional({
    example: '2026-08-04T10:00:00.000Z',
    description: 'Fecha/hora hasta la que la vacante es visible',
  })
  @IsOptional()
  @IsISO8601()
  validUntil?: string;

  @ApiPropertyOptional({
    example: 'Startup SA',
    description: 'Nombre de la empresa',
  })
  @IsOptional()
  @IsString()
  companyName?: string;

  @ApiPropertyOptional({
    example: '/uploads/companies/logo.png',
    description: 'URL o path del logo de empresa',
  })
  @IsOptional()
  @IsString()
  companyLogo?: string;

  @ApiPropertyOptional({
    example: [1, 2, 3],
    description: 'IDs de categorias asociadas a la vacante',
    type: [Number],
  })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  categoryIds: number[] = [];
}
