import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ContactsService } from './contacts.service';
import { LogContactDto } from './dto/log-contact.dto';

@ApiTags('Contacts')
@Controller('contacts')
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Post('log')
  @ApiOperation({ summary: 'Registrar un contacto con un profesional' })
  @ApiResponse({ status: 201, description: 'Contacto registrado' })
  async log(@Body() dto: LogContactDto) {
    return this.contactsService.log(dto);
  }
}
