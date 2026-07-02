import { IsEnum, IsInt, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DocumentType } from '@prisma/client';

export class UploadDocumentDto {
  @ApiProperty({
    enum: DocumentType,
    description: 'Tipo de documento (dni, cv, title, certificate)',
  })
  @IsEnum(DocumentType)
  type: DocumentType;

  @ApiPropertyOptional({
    description: 'ID de la educacion asociada (para titles)',
  })
  @IsOptional()
  @IsUUID()
  educationId?: string;

  @ApiPropertyOptional({
    description: 'ID de la certificacion asociada (para certificates)',
  })
  @IsOptional()
  @IsUUID()
  certificationId?: string;

  @ApiPropertyOptional({
    description: 'ID de la profesion asociada (nivel 3 de la taxonomia)',
  })
  @IsOptional()
  @IsInt()
  professionId?: number;
}
