import { IsString, IsOptional, IsInt } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCertificationDto {
  @ApiProperty({
    example: 'Google UX Design Certificate',
    description: 'Nombre del curso o certificacion',
  })
  @IsString()
  name: string;

  @ApiProperty({ example: 'Google / Coursera', description: 'Institucion' })
  @IsString()
  institution: string;

  @ApiPropertyOptional({ example: 2023, description: 'Ano de obtencion' })
  @IsOptional()
  @IsInt()
  year?: number;
}
