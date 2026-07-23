import { IsNotEmpty, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdatePostContentDto {
  @ApiProperty({
    example: 'Contenido editado del post.',
    maxLength: 5000,
    description: 'Nuevo contenido del post',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  content: string;
}
