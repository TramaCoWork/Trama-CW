import { ApiProperty } from '@nestjs/swagger';
import { IsObject } from 'class-validator';

export class SubmitLandingDto {
  @ApiProperty({
    type: 'object',
    additionalProperties: { type: 'string' },
    description: 'Datos enviados por etiqueta de campo',
  })
  @IsObject()
  data!: Record<string, string>;
}
