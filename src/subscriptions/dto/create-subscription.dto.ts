import { IsString, IsUrl, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSubscriptionDto {
  @ApiProperty({ example: 'uuid-del-plan' })
  @IsString()
  planId: string;

  @ApiProperty({ example: 'https://miapp.com/subscription/result' })
  @IsUrl()
  backUrl: string;

  @ApiPropertyOptional({
    example: 'mp_checkout',
    description: 'Estrategia de pago a utilizar (mp_checkout, mp_subscription). Si no se envía, usa el default del servidor.',
  })
  @IsOptional()
  @IsString()
  paymentStrategy?: string;
}
