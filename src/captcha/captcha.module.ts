import { Module } from '@nestjs/common';
import { CAPTCHA_VALIDATOR } from './captcha-validator.interface';
import { TurnstileValidatorService } from './turnstile-validator.service';

@Module({
  providers: [
    {
      provide: CAPTCHA_VALIDATOR,
      useClass: TurnstileValidatorService,
    },
  ],
  exports: [CAPTCHA_VALIDATOR],
})
export class CaptchaModule {}
