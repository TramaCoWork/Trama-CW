import { IsUUID, IsEnum } from 'class-validator';
import { ContactType } from '@prisma/client';

export class LogContactDto {
  @IsUUID()
  professionalId: string;

  @IsEnum(ContactType)
  contactType: ContactType;
}
