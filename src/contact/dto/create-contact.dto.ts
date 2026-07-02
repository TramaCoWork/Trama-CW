import { IsString, IsEmail, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateContactDto {
  @ApiProperty({ example: 'Juan Pérez', description: 'Nombre del remitente' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({
    example: 'juan@example.com',
    description: 'Email del remitente',
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'Consulta sobre planes',
    description: 'Asunto del mensaje',
  })
  @IsString()
  @MinLength(3)
  subject: string;

  @ApiProperty({
    example: 'Hola, quisiera saber más sobre los planes disponibles...',
    description: 'Mensaje (min 10 caracteres)',
  })
  @IsString()
  @MinLength(10)
  message: string;

  @ApiProperty({
    example: '0.token...',
    description: 'Token de Cloudflare Turnstile',
  })
  @IsString()
  turnstileToken: string;
}
