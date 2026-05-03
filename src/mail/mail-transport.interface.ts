export interface MailTransport {
  send(to: string, subject: string, html: string): Promise<void>;
}

export const MAIL_TRANSPORT = 'MAIL_TRANSPORT';
