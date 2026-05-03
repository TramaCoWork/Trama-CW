import { IsString, IsNotEmpty, IsUUID, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCommentDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000', description: 'ID del post' })
  @IsUUID()
  postId: string;

  @ApiProperty({ example: 'Excelente aporte!', maxLength: 500, description: 'Contenido del comentario' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  content: string;
}
