import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateCommunityChannelDto {
  @ApiProperty({
    example: 'Diseño UX',
    maxLength: 120,
    description: 'Nombre del canal',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name: string;

  @ApiPropertyOptional({
    example: 'Canal para profesionales de UX/UI',
    description: 'Descripción del canal',
  })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Indica si el canal está activo',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
