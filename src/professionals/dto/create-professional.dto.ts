import {
  IsArray,
  IsDecimal,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  ArrayMaxSize,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProfessionalDto {
  @ApiProperty({ example: 'Ana García', description: 'Nombre completo del profesional' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Diseñadora UX con 5 años de experiencia', description: 'Breve bio del profesional' })
  @IsOptional()
  @IsString()
  bio?: string;

  @ApiPropertyOptional({ example: 'https://example.com/photo.jpg', description: 'URL de la foto de perfil' })
  @IsOptional()
  @IsString()
  photo?: string;

  @ApiProperty({ example: ['UX Design', 'UI Design'], type: [String], description: 'Lista de servicios ofrecidos' })
  @IsArray()
  @IsString({ each: true })
  services: string[];

  @ApiPropertyOptional({ example: '50.00', description: 'Precio minimo (decimal)' })
  @IsOptional()
  @IsDecimal()
  priceMin?: string;

  @ApiPropertyOptional({ example: '150.00', description: 'Precio maximo (decimal)' })
  @IsOptional()
  @IsDecimal()
  priceMax?: string;

  @ApiProperty({ example: 'Buenos Aires', description: 'Ciudad' })
  @IsString()
  city: string;

  @ApiProperty({ example: 1, description: 'ID del rubro (nivel 1 de la taxonomia)' })
  @IsInt()
  rubroId: number;

  @ApiPropertyOptional({ example: [14, 17], type: [Number], description: 'IDs de profesiones (nivel 3, max 5)' })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  @ArrayMaxSize(5)
  professionCategoryIds?: number[];

  @ApiPropertyOptional({ example: '+5491112345678', description: 'Numero de WhatsApp' })
  @IsOptional()
  @IsString()
  whatsapp?: string;

  @ApiPropertyOptional({ example: 'ana@example.com', description: 'Email de contacto profesional' })
  @IsOptional()
  @IsEmail()
  emailContact?: string;
}
