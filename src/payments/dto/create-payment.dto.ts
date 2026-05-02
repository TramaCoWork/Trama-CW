import { IsNumber, IsPositive, IsString, IsOptional, IsIn } from 'class-validator';

export class CreatePaymentDto {
  @IsNumber()
  @IsPositive()
  amount: number;

  @IsString()
  @IsOptional()
  currency: string = 'ARS';

  @IsString()
  @IsIn(['mercadopago', 'stripe'])
  paymentProvider: string;
}
