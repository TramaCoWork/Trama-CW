import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateJobDto {
  @ApiProperty({
    example: 'Diseñador UX para startup',
    description: 'Titulo del trabajo',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    example: 'Buscamos diseñador UX con experiencia en apps moviles',
    description: 'Descripcion del trabajo',
  })
  @IsString()
  @IsNotEmpty()
  description: string;
}
