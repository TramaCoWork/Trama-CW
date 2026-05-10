import { IsString, IsUUID, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ResetPasswordDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000', description: 'ID del usuario' })
  @IsUUID()
  userId: string;

  @ApiProperty({ example: 'abc123token', description: 'Token de recuperacion recibido por email' })
  @IsString()
  token: string;

  @ApiProperty({ example: 'newPassword123', description: 'Nueva contraseña (min 6 caracteres)' })
  @IsString()
  @MinLength(6)
  newPassword: string;
}
