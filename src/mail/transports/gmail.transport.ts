import { Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import type { MailTransport } from '../mail-transport.interface';

export interface GmailConfig {
  user: string;
  appPassword: string;
  from: string;
}

export class GmailTransport implements MailTransport {
  private readonly logger = new Logger('MailGmailTransport');
  private readonly transporter: nodemailer.Transporter;
  private readonly from: string;

  constructor(config: GmailConfig) {
    this.from = config.from;
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: config.user,
        pass: config.appPassword,
      },
    });
  }

  async send(to: string, subject: string, html: string): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.from,
        to,
        subject,
        html,
      });
      this.logger.log(`Email sent via Gmail to ${to}: ${subject}`);
    } catch (error) {
      this.logger.error(
        `Failed to send email via Gmail to ${to}: ${error.message}`,
      );
      throw error;
    }
  }
}
