export interface CaptchaValidator {
  validate(token: string): Promise<boolean>;
}

export const CAPTCHA_VALIDATOR = 'CAPTCHA_VALIDATOR';
