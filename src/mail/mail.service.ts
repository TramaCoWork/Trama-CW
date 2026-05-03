import { Injectable, Inject, Logger } from '@nestjs/common';
import { MAIL_TRANSPORT } from './mail-transport.interface';
import type { MailTransport } from './mail-transport.interface';
import { profileApprovedTemplate } from './templates/profile-approved';
import { profileRejectedTemplate } from './templates/profile-rejected';

@Injectable()
export class MailService {
  private readonly logger = new Logger('MailService');

  constructor(
    @Inject(MAIL_TRANSPORT) private readonly transport: MailTransport,
  ) {}

  async sendProfileApproved(email: string, name: string): Promise<void> {
    const { subject, html } = profileApprovedTemplate(name);
    try {
      await this.transport.send(email, subject, html);
    } catch (error) {
      this.logger.error(`Error sending approval email to ${email}: ${error.message}`);
    }
  }

  async sendProfileRejected(email: string, name: string, notes?: string): Promise<void> {
    const { subject, html } = profileRejectedTemplate(name, notes);
    try {
      await this.transport.send(email, subject, html);
    } catch (error) {
      this.logger.error(`Error sending rejection email to ${email}: ${error.message}`);
    }
  }
}
