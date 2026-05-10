import { IsString, IsEmail, IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSubscriptionDto {
  @ApiProperty({ example: 'uuid-del-plan' })
  @IsString()
  planId: string;

  @ApiProperty({ example: 'usuario@email.com' })
  @IsEmail()
  payerEmail: string;

  @ApiProperty({ example: 'https://miapp.com/subscription/result' })
  @IsUrl()
  backUrl: string;
}
