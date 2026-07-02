import { IsEmail } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResendVerificationDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'Email de la cuenta a verificar',
  })
  @IsEmail()
  email: string;
}
