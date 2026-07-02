import { IsString, IsOptional, IsUUID, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApplyJobDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID del trabajo',
  })
  @IsUUID()
  jobId: string;

  @ApiPropertyOptional({
    example: 'Me interesa este puesto porque...',
    maxLength: 1000,
    description: 'Carta de presentacion',
  })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  coverLetter?: string;
}
