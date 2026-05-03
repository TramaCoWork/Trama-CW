import { ConfigService } from '@nestjs/config';
import type { MailTransport } from './mail-transport.interface';
import { ConsoleTransport } from './transports/console.transport';
import { SmtpTransport } from './transports/smtp.transport';
import { GmailTransport } from './transports/gmail.transport';

export function createMailTransport(config: ConfigService): MailTransport {
  const provider = config.get<string>('MAIL_PROVIDER');
  const from = config.get<string>('MAIL_FROM', 'noreply@trama.com');

  switch (provider) {
    case 'smtp':
      return new SmtpTransport({
        host: config.getOrThrow<string>('SMTP_HOST'),
        port: parseInt(config.get<string>('SMTP_PORT', '587')),
        secure: config.get<string>('SMTP_SECURE', 'false') === 'true',
        user: config.getOrThrow<string>('SMTP_USER'),
        pass: config.getOrThrow<string>('SMTP_PASS'),
        from,
      });

    case 'gmail':
      return new GmailTransport({
        user: config.getOrThrow<string>('GMAIL_USER'),
        appPassword: config.getOrThrow<string>('GMAIL_APP_PASSWORD'),
        from,
      });

    default:
      return new ConsoleTransport();
  }
}
