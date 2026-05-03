import { IsNumber, IsPositive, IsString, IsOptional, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePaymentDto {
  @ApiProperty({ example: 5000, description: 'Monto del pago' })
  @IsNumber()
  @IsPositive()
  amount: number;

  @ApiPropertyOptional({ example: 'ARS', default: 'ARS', description: 'Moneda' })
  @IsString()
  @IsOptional()
  currency: string = 'ARS';

  @ApiProperty({ example: 'mercadopago', enum: ['mercadopago', 'stripe'], description: 'Proveedor de pago' })
  @IsString()
  @IsIn(['mercadopago', 'stripe'])
  paymentProvider: string;
}
