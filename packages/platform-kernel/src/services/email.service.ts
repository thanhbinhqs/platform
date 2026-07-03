import { Injectable, Logger } from '@nestjs/common';

export interface EmailPayload {
  to: string;
  subject: string;
  body: string;
  html?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  async send(payload: EmailPayload): Promise<boolean> {
    this.logger.log(`[EMAIL] To: ${payload.to}`);
    this.logger.log(`[EMAIL] Subject: ${payload.subject}`);
    this.logger.log(`[EMAIL] Body: ${payload.body.slice(0, 200)}`);
    // TODO: Wire real SMTP/Nodemailer transporter
    return true;
  }

  async sendPasswordReset(email: string, resetLink: string): Promise<boolean> {
    return this.send({
      to: email,
      subject: 'Password Reset Request',
      body: `Click the link to reset your password: ${resetLink}\n\nThis link expires in 1 hour.`,
      html: `<p>Click <a href="${resetLink}">here</a> to reset your password.</p>
             <p>This link expires in 1 hour.</p>`,
    });
  }
}