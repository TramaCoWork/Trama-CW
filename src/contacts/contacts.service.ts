import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LogContactDto } from './dto/log-contact.dto';

@Injectable()
export class ContactsService {
  constructor(private readonly prisma: PrismaService) {}

  async log(dto: LogContactDto) {
    return this.prisma.contactLog.create({
      data: {
        professionalId: dto.professionalId,
        contactType: dto.contactType,
        estimated: false,
      },
    });
  }
}
