import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsPositive } from 'class-validator';

export class UpdateSubscriptionAmountDto {
  @ApiProperty({
    description: 'Nuevo monto a cobrar en el próximo ciclo',
    example: 33000,
  })
  @IsNumber()
  @IsPositive()
  amount: number;
}
