import { Injectable } from '@nestjs/common';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private resend: Resend;

  constructor() {
    this.resend = new Resend(process.env.RESEND_API_KEY);
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
      console.error('Resend error:', error);
      throw error;
    }
  }
}
