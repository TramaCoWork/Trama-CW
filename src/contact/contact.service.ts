import { Injectable, Inject, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CAPTCHA_VALIDATOR } from '../captcha/captcha-validator.interface';
import type { CaptchaValidator } from '../captcha/captcha-validator.interface';
import { MailService } from '../mail/mail.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { CreateProfessionalContactDto } from './dto/create-professional-contact.dto';
import { PrismaService } from '../prisma/prisma.service';
import { withoutDeleted } from '../common/filters/soft-delete.filter';

@Injectable()
export class ContactService {
  private readonly supportEmail: string;

  constructor(
    @Inject(CAPTCHA_VALIDATOR) private readonly captchaValidator: CaptchaValidator,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.supportEmail = this.configService.get<string>('SUPPORT_EMAIL', '');
  }

  async sendContactForm(dto: CreateContactDto): Promise<{ message: string }> {
    const valid = await this.captchaValidator.validate(dto.turnstileToken);

    if (!valid) {
      throw new BadRequestException('Captcha invalido. Intenta nuevamente.');
    }

    if (!this.supportEmail) {
      throw new BadRequestException('El servicio de contacto no esta configurado.');
    }

    await this.mailService.sendContactForm(this.supportEmail, {
      name: dto.name,
      email: dto.email,
      subject: dto.subject,
      message: dto.message,
    });

    return { message: 'Mensaje enviado exitosamente. Nos pondremos en contacto pronto.' };
  }

  async sendProfessionalContact(dto: CreateProfessionalContactDto): Promise<{ message: string }> {
    const valid = await this.captchaValidator.validate(dto.turnstileToken);

    if (!valid) {
      throw new BadRequestException('Captcha invalido. Intenta nuevamente.');
    }

    const profile = await this.prisma.professionalProfile.findUnique({
      where: withoutDeleted({ id: dto.professionalId }),
      include: { user: true },
    });

    if (!profile) {
      throw new NotFoundException('Profesional no encontrado.');
    }

    const professionalEmail = profile.emailContact ?? profile.user.email;

    await this.mailService.sendProfessionalContact(professionalEmail, {
      senderName: dto.email,
      senderEmail: dto.email,
      message: dto.message,
    });

    return { message: 'Mensaje enviado exitosamente. Nos pondremos en contacto pronto.' };
  }
}
