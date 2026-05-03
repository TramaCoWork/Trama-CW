import { IsString, IsOptional, IsEnum, IsInt } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EducationLevel } from '@prisma/client';

export class CreateEducationDto {
  @ApiProperty({ enum: EducationLevel, description: 'Nivel de estudios' })
  @IsEnum(EducationLevel)
  level: EducationLevel;

  @ApiProperty({ example: 'Licenciatura en Diseño Grafico', description: 'Titulo obtenido' })
  @IsString()
  title: string;

  @ApiProperty({ example: 'Universidad de Buenos Aires', description: 'Institucion educativa' })
  @IsString()
  institution: string;

  @ApiPropertyOptional({ example: 2020, description: 'Ano de finalizacion' })
  @IsOptional()
  @IsInt()
  year?: number;
}
