import { IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateMotivationDto {
  @ApiProperty({
    example: 'Me gustaria formar parte de Trama porque busco un espacio de crecimiento profesional y networking.',
    maxLength: 300,
    description: 'Por que te gustaria formar parte de Trama? (max 300 caracteres)',
  })
  @IsString()
  @MaxLength(300)
  tramaMotivation: string;
}
