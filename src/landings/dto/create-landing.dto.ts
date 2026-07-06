import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsISO8601, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateLandingDto {
  @ApiProperty({ description: 'Título de la landing page' })
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiProperty({ description: 'Contenido HTML enriquecido' })
  @IsString()
  @IsNotEmpty()
  body!: string;

  @ApiPropertyOptional({ description: 'Si la landing está publicada' })
  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;

  @ApiPropertyOptional({ description: 'Fecha ISO desde la que es válida' })
  @IsOptional()
  @IsISO8601()
  validFrom?: string;

  @ApiPropertyOptional({ description: 'Fecha ISO hasta la que es válida' })
  @IsOptional()
  @IsISO8601()
  validUntil?: string;
}
