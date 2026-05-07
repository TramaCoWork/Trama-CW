import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DocumentVerificationStatus } from '@prisma/client';

export class VerifyDocumentDto {
  @ApiProperty({
    enum: ['approved', 'rejected'],
    description: 'Resultado de la verificacion del documento',
    example: 'approved',
  })
  @IsEnum(DocumentVerificationStatus, {
    message: 'status debe ser "approved" o "rejected"',
  })
  status: DocumentVerificationStatus;

  @ApiPropertyOptional({
    example: 'Titulo universitario verificado correctamente',
    description: 'Notas u observaciones sobre la verificacion',
  })
  @IsOptional()
  @IsString()
  verificationNotes?: string;
}
