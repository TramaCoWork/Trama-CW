import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class RegisterPushSubscriptionDto {
  @ApiProperty({
    description:
      'UUID de la suscripcion/dispositivo generado por el proveedor de push (ej. OneSignal subscription id)',
    example: 'b2f7c1e0-1a2b-3c4d-5e6f-7a8b9c0d1e2f',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  subscriptionId: string;

  @ApiPropertyOptional({
    description: 'Proveedor de push. Default: "onesignal"',
    example: 'onesignal',
    default: 'onesignal',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  provider?: string;
}
