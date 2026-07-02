import { IsString, IsOptional, IsUUID, IsEmail, IsUrl } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BricksSubscribeDto {
  @ApiProperty({ example: 'uuid-del-plan' })
  @IsUUID()
  planId: string;

  @ApiProperty({
    description: 'Card token generado por el Brick en el cliente (un solo uso)',
  })
  @IsString()
  token: string;

  @ApiPropertyOptional({
    description:
      'Email del pagador. Si no se envía, usa el del usuario autenticado.',
  })
  @IsOptional()
  @IsEmail()
  payerEmail?: string;

  @ApiPropertyOptional({
    example: 'https://miapp.com/subscription',
    description:
      'URL de retorno (back_url de MP). Si no se envía, usa FRONTEND_URL.',
  })
  @IsOptional()
  @IsUrl()
  backUrl?: string;
}
