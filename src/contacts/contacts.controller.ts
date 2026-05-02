import { Controller, Post, Body } from '@nestjs/common';
import { ContactsService } from './contacts.service';
import { LogContactDto } from './dto/log-contact.dto';

@Controller('contacts')
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Post('log')
  async log(@Body() dto: LogContactDto) {
    return this.contactsService.log(dto);
  }
}
