import { IsUUID, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ContactType } from '@prisma/client';

export class LogContactDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID del profesional',
  })
  @IsUUID()
  professionalId: string;

  @ApiProperty({
    enum: ContactType,
    example: 'whatsapp',
    description: 'Tipo de contacto',
  })
  @IsEnum(ContactType)
  contactType: ContactType;
}
