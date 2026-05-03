import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MAIL_TRANSPORT } from './mail-transport.interface';
import { createMailTransport } from './mail-transport.factory';
import { MailService } from './mail.service';

@Module({
  providers: [
    {
      provide: MAIL_TRANSPORT,
      useFactory: (config: ConfigService) => createMailTransport(config),
      inject: [ConfigService],
    },
    MailService,
  ],
  exports: [MailService],
})
export class MailModule {}
