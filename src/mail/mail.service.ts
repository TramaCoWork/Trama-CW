import { Injectable, Inject, Logger } from '@nestjs/common';
import { MAIL_TRANSPORT } from './mail-transport.interface';
import type { MailTransport } from './mail-transport.interface';
import { profileApprovedTemplate } from './templates/profile-approved';
import { profileRejectedTemplate } from './templates/profile-rejected';
import { welcomeTemplate } from './templates/welcome';
import { emailVerificationTemplate } from './templates/email-verification';
import { resetPasswordTemplate } from './templates/reset-password';
import { paymentReminderTemplate } from './templates/payment-reminder';
import { contactFormTemplate } from './templates/contact-form';
import { professionalContactTemplate } from './templates/professional-contact';

@Injectable()
export class MailService {
  private readonly logger = new Logger('MailService');

  constructor(
    @Inject(MAIL_TRANSPORT) private readonly transport: MailTransport,
  ) {}

  async sendEmailVerification(email: string, verificationUrl: string, name?: string): Promise<void> {
    const { subject, html } = emailVerificationTemplate(verificationUrl, name);
    try {
      await this.transport.send(email, subject, html);
    } catch (error) {
      this.logger.error(`Error sending verification email to ${email}: ${error.message}`);
    }
  }

  async sendWelcome(email: string, name?: string): Promise<void> {
    const { subject, html } = welcomeTemplate(name);
    try {
      await this.transport.send(email, subject, html);
    } catch (error) {
      this.logger.error(`Error sending welcome email to ${email}: ${error.message}`);
    }
  }

  async sendProfileApproved(email: string, name: string): Promise<void> {
    const { subject, html } = profileApprovedTemplate(name);
    try {
      await this.transport.send(email, subject, html);
    } catch (error) {
      this.logger.error(`Error sending approval email to ${email}: ${error.message}`);
    }
  }

  async sendPasswordReset(email: string, resetUrl: string, name?: string): Promise<void> {
    const { subject, html } = resetPasswordTemplate(resetUrl, name);
    try {
      await this.transport.send(email, subject, html);
    } catch (error) {
      this.logger.error(`Error sending password reset email to ${email}: ${error.message}`);
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

  async sendPaymentReminder(email: string, name: string, planName: string, paymentUrl: string): Promise<void> {
    const { subject, html } = paymentReminderTemplate(name, planName, paymentUrl);
    try {
      await this.transport.send(email, subject, html);
    } catch (error) {
      this.logger.error(`Error sending payment reminder to ${email}: ${error.message}`);
    }
  }

  async sendContactForm(to: string, data: { name: string; email: string; subject: string; message: string }): Promise<void> {
    const { subject, html } = contactFormTemplate(data);
    try {
      await this.transport.send(to, subject, html);
    } catch (error) {
      this.logger.error(`Error sending contact form email: ${error.message}`);
    }
  }

  async sendProfessionalContact(to: string, data: { senderName: string; senderEmail: string; message: string }): Promise<void> {
    const { subject, html } = professionalContactTemplate(data);
    try {
      await this.transport.send(to, subject, html);
    } catch (error) {
      this.logger.error(`Error sending professional contact email: ${error.message}`);
    }
  }
}
