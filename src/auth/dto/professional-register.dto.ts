import { IsInt, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RegisterDto } from './register.dto';

export class ProfessionalRegisterDto extends RegisterDto {
  @ApiProperty({ example: 'Ana García', description: 'Nombre completo' })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    example: 'Buenos Aires',
    description: 'Ciudad de residencia',
  })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({
    example: 'Av. Corrientes 1234',
    description: 'Dirección de residencia (texto libre)',
  })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({
    example: 1,
    description: 'ID del rubro (nivel 1 de la taxonomia de profesiones)',
  })
  @IsOptional()
  @IsInt()
  rubroId?: number;

  @ApiPropertyOptional({ example: 1, description: 'ID del país' })
  @IsOptional()
  @IsInt()
  countryId?: number;

  @ApiPropertyOptional({ example: 1, description: 'ID de la provincia' })
  @IsOptional()
  @IsInt()
  provinceId?: number;

  @ApiPropertyOptional({
    example: '+5491112345678',
    description: 'Numero de WhatsApp',
  })
  @IsOptional()
  @IsString()
  whatsapp?: string;

  @ApiPropertyOptional({
    example: 'seba@gmail.com',
    description: 'Código de referido (referralCode del usuario que refirió)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  referralCode?: string;
}
