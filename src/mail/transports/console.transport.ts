import { Logger } from '@nestjs/common';
import type { MailTransport } from '../mail-transport.interface';

export class ConsoleTransport implements MailTransport {
  private readonly logger = new Logger('MailConsoleTransport');

  async send(to: string, subject: string, html: string): Promise<void> {
    this.logger.log('─── EMAIL (console) ───────────────────────────────');
    this.logger.log(`To:      ${to}`);
    this.logger.log(`Subject: ${subject}`);
    this.logger.log(`Body:    ${html.replace(/<[^>]*>/g, '').substring(0, 200)}...`);
    this.logger.log('──────────────────────────────────────────────────');
  }
}
