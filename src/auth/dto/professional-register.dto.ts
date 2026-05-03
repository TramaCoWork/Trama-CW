import { IsArray, IsInt, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RegisterDto } from './register.dto';

export class ProfessionalRegisterDto extends RegisterDto {
  @ApiProperty({ example: 'Ana García', description: 'Nombre completo' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'Buenos Aires', description: 'Ciudad de residencia' })
  @IsString()
  city: string;

  @ApiProperty({ example: [1, 2], type: [Number], description: 'IDs de categorias' })
  @IsArray()
  @IsInt({ each: true })
  categories: number[];

  @ApiPropertyOptional({ example: '+5491112345678', description: 'Numero de WhatsApp' })
  @IsOptional()
  @IsString()
  whatsapp?: string;
}
