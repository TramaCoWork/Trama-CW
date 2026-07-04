import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ApplyJobDto {
  @ApiPropertyOptional({
    example: 'Me interesa este puesto porque...',
    description: 'Carta de presentacion',
  })
  @IsOptional()
  @IsString()
  coverLetter?: string;
}
