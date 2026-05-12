import { Controller, Post, Body, UsePipes, ValidationPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ContactService } from './contact.service';
import { CreateContactDto } from './dto/create-contact.dto';

@ApiTags('Contact')
@Controller('contact')
export class ContactController {
  constructor(private readonly contactService: ContactService) {}

  @Post()
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: 'Enviar formulario de contacto (publico, con captcha)' })
  @ApiBody({ type: CreateContactDto })
  @ApiResponse({ status: 201, description: 'Mensaje enviado exitosamente' })
  @ApiResponse({ status: 400, description: 'Captcha invalido o servicio no configurado' })
  @ApiResponse({ status: 429, description: 'Demasiados intentos. Intenta mas tarde.' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  sendContact(@Body() dto: CreateContactDto) {
    return this.contactService.sendContactForm(dto);
  }
}
