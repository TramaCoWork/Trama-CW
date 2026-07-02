import { CommunityImageEntityType } from '@prisma/client';
import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  IsArray,
  IsEnum,
  IsString,
  IsUUID,
} from 'class-validator';

export class AssociateImagesDto {
  @ApiProperty({ type: [String], description: 'IDs de imágenes a asociar' })
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  imageIds: string[];

  @ApiProperty({ enum: CommunityImageEntityType })
  @IsEnum(CommunityImageEntityType)
  entityType: CommunityImageEntityType;

  @ApiProperty({ description: 'ID de la entidad destino' })
  @IsString()
  entityId: string;
}

// Trazabilidad: generado por Programmer en 2026-05-15 18:02:40
