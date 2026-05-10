import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePostDto {
  @ApiProperty({ example: 'Hola a todos! Soy nueva en la plataforma.', maxLength: 2000, description: 'Contenido del post' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  content: string;

  @ApiPropertyOptional({ example: 'general', description: 'Slug del canal. Default: "general". Puede ser el slug del rubro del profesional.' })
  @IsOptional()
  @IsString()
  channelSlug?: string;
}
