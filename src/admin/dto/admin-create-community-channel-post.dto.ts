import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class AdminCreateCommunityChannelPostDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID del usuario autor del post',
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsUUID()
  userId?: string;

  @ApiProperty({
    example: 'Les comparto una búsqueda laboral en UX.',
    maxLength: 5000,
    description: 'Contenido del post',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  content: string;
}
