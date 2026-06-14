import { IsString, IsInt, IsOptional, IsUUID, IsEmail, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BricksPayDto {
  @ApiProperty({ example: 'uuid-del-plan' })
  @IsUUID()
  planId: string;

  @ApiProperty({ description: 'Token de tarjeta generado por el Brick en el cliente' })
  @IsString()
  token: string;

  @ApiProperty({ example: 'visa', description: 'payment_method_id devuelto por el Brick (onSubmit)' })
  @IsString()
  paymentMethodId: string;

  @ApiPropertyOptional({
    example: 'credit_card',
    description: 'payment_type_id del Brick (credit_card | debit_card). Default: credit_card',
  })
  @IsOptional()
  @IsString()
  paymentType?: string;

  @ApiPropertyOptional({ example: '310', description: 'issuer_id devuelto por el Brick (onSubmit)' })
  @IsOptional()
  @IsString()
  issuerId?: string;

  @ApiProperty({ example: 1, description: 'Cantidad de cuotas seleccionada en el Brick' })
  @IsInt()
  @Min(1)
  installments: number;

  @ApiPropertyOptional({
    description: 'Email del pagador. Si no se envía, usa el del usuario autenticado.',
  })
  @IsOptional()
  @IsEmail()
  payerEmail?: string;

  @ApiPropertyOptional({ example: 'DNI', description: 'Tipo de documento del pagador' })
  @IsOptional()
  @IsString()
  identificationType?: string;

  @ApiPropertyOptional({ example: '12345678', description: 'Número de documento del pagador' })
  @IsOptional()
  @IsString()
  identificationNumber?: string;
}
