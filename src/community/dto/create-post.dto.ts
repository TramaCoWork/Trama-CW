import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePostDto {
  @ApiProperty({ example: 'Hola a todos! Soy nueva en la plataforma.', maxLength: 2000, description: 'Contenido del post' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  content: string;
}
