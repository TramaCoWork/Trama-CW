import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength, Matches } from 'class-validator';

export class UpdateReferralCodeDto {
  @ApiProperty({
    example: 'mi-codigo-2026',
    description:
      'Nuevo código de referido único. Solo letras, números, puntos, guiones y @.',
  })
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  referralCode: string;
}
