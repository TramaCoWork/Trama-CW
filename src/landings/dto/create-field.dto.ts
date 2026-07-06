import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FieldType } from '@prisma/client';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateFieldDto {
  @ApiProperty({ description: 'Etiqueta visible del campo' })
  @IsString()
  @IsNotEmpty()
  label!: string;

  @ApiProperty({ enum: FieldType, description: 'Tipo de campo' })
  @IsEnum(FieldType)
  type!: FieldType;

  @ApiPropertyOptional({ description: 'Si el campo es obligatorio' })
  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @ApiPropertyOptional({ description: 'Orden visual del campo' })
  @IsOptional()
  @IsInt()
  order?: number;

  @ApiPropertyOptional({
    type: [String],
    description: 'Opciones disponibles para campos tipo select',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  options?: string[];
}
