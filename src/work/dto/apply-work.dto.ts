import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ApplyWorkDto {
  @ApiPropertyOptional({
    example: 'Me interesa este puesto porque...',
    description: 'Carta de presentacion',
  })
  @IsOptional()
  @IsString()
  coverLetter?: string;
}
