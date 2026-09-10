import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';

type SignupOtpEmailInput = {
  to: string;
  name: string;
  code: string;
  expiresInMinutes: number;
};

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly config: ConfigService) {}

  async sendSignupOtp(input: SignupOtpEmailInput) {
    const transporter = this.createTransporter();

    if (!transporter) {
      this.logger.warn(
        `SMTP is not configured. Signup OTP for ${input.to}: ${input.code}`,
      );
      return { sent: false, mode: 'development' as const };
    }

    await transporter.sendMail({
      from: this.getFromAddress(),
      to: input.to,
      subject: 'Verify your KevzaAI account',
      text: this.renderSignupOtpText(input),
      html: this.renderSignupOtpHtml(input),
    });

    return { sent: true, mode: 'smtp' as const };
  }

  private createTransporter() {
    const host = this.config.get<string>('SMTP_HOST');
    const port = Number(this.config.get<string>('SMTP_PORT') || 587);
    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASS');

    if (!host || !user || !pass) {
      return null;
    }

    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
  }

  private getFromAddress() {
    return (
      this.config.get<string>('EMAIL_FROM') ||
      this.config.get<string>('SMTP_USER') ||
      'KevzaAI <no-reply@kevza.ai>'
    );
  }

  private renderSignupOtpText(input: SignupOtpEmailInput) {
    return [
      `Hi ${input.name},`,
      '',
      `Your KevzaAI verification code is ${input.code}.`,
      `This code expires in ${input.expiresInMinutes} minutes.`,
      '',
      'If you did not create this account, you can ignore this email.',
      '',
      'KevzaAI',
    ].join('\n');
  }

  private renderSignupOtpHtml(input: SignupOtpEmailInput) {
    return `
      <div style="font-family: Arial, sans-serif; color: #0d1f3c; line-height: 1.6;">
        <h2 style="margin: 0 0 12px;">Verify your KevzaAI account</h2>
        <p>Hi ${this.escapeHtml(input.name)},</p>
        <p>Your verification code is:</p>
        <p style="font-size: 28px; font-weight: 700; letter-spacing: 6px; margin: 16px 0;">${input.code}</p>
        <p>This code expires in ${input.expiresInMinutes} minutes.</p>
        <p>If you did not create this account, you can ignore this email.</p>
      </div>
    `;
  }

  private escapeHtml(value: string) {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
