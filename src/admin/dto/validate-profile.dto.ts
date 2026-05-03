import { IsString, IsOptional, IsEnum, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ValidationStatus } from '@prisma/client';

export class ValidateProfileDto {
  @ApiProperty({ enum: ['manual_approved', 'manual_rejected'], description: 'Resultado de la validacion' })
  @IsEnum(ValidationStatus)
  status: ValidationStatus;

  @ApiPropertyOptional({ example: 'CV verificado, titulos coinciden con el perfil', description: 'Notas de la revision' })
  @IsOptional()
  @IsString()
  reviewNotes?: string;

  @ApiPropertyOptional({ example: ['doc-id-1', 'doc-id-2'], type: [String], description: 'IDs de documentos revisados' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  documentsReviewed?: string[];
}
