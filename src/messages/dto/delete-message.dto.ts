import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';

export class DeleteMessageDto {
  @ApiPropertyOptional({
    example: false,
    default: false,
    description:
      'Si es true, elimina el mensaje para ambas partes (solo remitente).',
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined) {
      return false;
    }

    if (value === true || value === 'true') {
      return true;
    }

    if (value === false || value === 'false') {
      return false;
    }

    return value;
  })
  @IsBoolean()
  forAll = false;
}
