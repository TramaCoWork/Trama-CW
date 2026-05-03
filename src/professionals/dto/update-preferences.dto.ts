import { IsArray, IsOptional, IsEnum, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { UsageFrequency } from '@prisma/client';

export class UpdatePreferencesDto {
  @ApiPropertyOptional({
    example: ['espacio_trabajo', 'networking', 'comunidad'],
    type: [String],
    description: 'Intereses en Trama (multi-choice)',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  interestsInTrama?: string[];

  @ApiPropertyOptional({ enum: UsageFrequency, description: 'Frecuencia de uso del espacio' })
  @IsOptional()
  @IsEnum(UsageFrequency)
  usageFrequency?: UsageFrequency;

  @ApiPropertyOptional({
    example: ['escritorio_flexible', 'sala_reuniones'],
    type: [String],
    description: 'Tipos de espacio de interes',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  spaceTypes?: string[];
}
