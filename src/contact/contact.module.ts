import { Module } from '@nestjs/common';
import { CaptchaModule } from '../captcha/captcha.module';
import { MailModule } from '../mail/mail.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ContactController } from './contact.controller';
import { ContactService } from './contact.service';

@Module({
  imports: [CaptchaModule, MailModule, PrismaModule],
  controllers: [ContactController],
  providers: [ContactService],
})
export class ContactModule {}
