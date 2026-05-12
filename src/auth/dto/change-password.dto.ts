import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
  @ApiProperty({ example: 'currentPassword123', description: 'Contraseña actual' })
  @IsString()
  currentPassword: string;

  @ApiProperty({ example: 'newPassword456', description: 'Nueva contraseña (min 6 caracteres)' })
  @IsString()
  @MinLength(6)
  newPassword: string;
}
