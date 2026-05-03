import { IsEmail, IsEnum, IsOptional, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com', description: 'Email del usuario' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123', minLength: 8, description: 'Contraseña (min 8 caracteres)' })
  @MinLength(8)
  password: string;

  @ApiPropertyOptional({ enum: UserRole, description: 'Rol del usuario' })
  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}
