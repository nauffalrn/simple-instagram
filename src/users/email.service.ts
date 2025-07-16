import { ConsoleLogger, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private readonly logger = new ConsoleLogger(EmailService.name);
  private readonly resend: Resend;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    this.resend = new Resend(apiKey);
  }

  async sendVerificationEmail(to: string, token: string) {
    const verifyUrl = `http://localhost:3000/users/verify?token=${token}`;
    const { error } = await this.resend.emails.send({
      from: 'SimpleInstagram <noreply@resend.dev>',
      to: [to],
      subject: 'Verifikasi Email Anda',
      html: `<p>Silakan klik link berikut untuk verifikasi email:</p>
             <a href="${verifyUrl}">${verifyUrl}</a>`,
    });
    if (error) {
      this.logger.error('Resend error:', error);
      throw error;
    }
  }
}
