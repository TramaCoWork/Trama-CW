import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class AdminCommunityCommentDto {
  @ApiProperty({
    example: 'Excelente aporte!',
    maxLength: 2000,
    description: 'Contenido del comentario',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  content: string;
}
