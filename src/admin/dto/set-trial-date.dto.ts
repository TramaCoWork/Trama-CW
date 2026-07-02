import { ApiProperty } from '@nestjs/swagger';
import { IsISO8601, IsOptional } from 'class-validator';

export class SetTrialDateDto {
  @ApiProperty({
    description:
      'Fecha de fin de prueba en formato ISO-8601 o null para limpiar el valor',
    example: '2026-12-31T23:59:59.000Z',
    nullable: true,
    oneOf: [{ type: 'string', format: 'date-time' }, { type: 'null' }],
  })
  @IsOptional()
  @IsISO8601()
  trialEndDate?: string | null;
}
