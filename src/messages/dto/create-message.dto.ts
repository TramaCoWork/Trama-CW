import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateMessageDto {
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'ID del destinatario',
  })
  @IsUUID()
  @IsNotEmpty()
  receiverId: string;

  @ApiProperty({
    example: 'Hola, te escribo por un proyecto.',
    maxLength: 5000,
    description: 'Contenido del mensaje en Markdown',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  content: string;
}
