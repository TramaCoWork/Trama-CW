import { IsEmail, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({
    example: 'user@example.com',
    description: 'Email del usuario',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'password123',
    minLength: 8,
    description: 'Contraseña (min 8 caracteres)',
  })
  @MinLength(8)
  password: string;
}
