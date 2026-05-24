import { IsEmail, IsString, IsUUID, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateProfessionalContactDto {
  @ApiProperty({ example: 'maria@example.com', description: 'Email del remitente' })
  @IsEmail()
  email: string;

  @ApiProperty({
    example: 'Hola, vi tu perfil y quisiera coordinar una reunión para conversar sobre un proyecto.',
    description: 'Mensaje (min 10 caracteres)',
  })
  @IsString()
  @MinLength(10)
  message: string;

  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'UUID del profesional a contactar',
  })
  @IsUUID()
  professionalId: string;

  @ApiProperty({ example: '0.token...', description: 'Token de Cloudflare Turnstile' })
  @IsString()
  turnstileToken: string;
}
