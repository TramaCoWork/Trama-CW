import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CaptchaValidator } from './captcha-validator.interface';

@Injectable()
export class TurnstileValidatorService implements CaptchaValidator {
  private readonly secretKey: string;

  constructor(private readonly configService: ConfigService) {
    this.secretKey = this.configService.get<string>('TURNSTILE_SECRET_KEY', '');
  }

  async validate(token: string): Promise<boolean> {
    if (!this.secretKey) {
      // Si no hay secret key configurada, no validar (desarrollo)
      return true;
    }

    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        secret: this.secretKey,
        response: token,
      }),
    });

    const data = (await res.json()) as { success: boolean };
    return data.success;
  }
}
