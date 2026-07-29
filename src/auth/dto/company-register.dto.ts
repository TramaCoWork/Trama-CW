import { IsInt, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RegisterDto } from './register.dto';

export class CompanyRegisterDto extends RegisterDto {
  @ApiProperty({
    example: 'Estudio Norte',
    description: 'Nombre de fantasía de la empresa/emprendimiento',
  })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiProperty({
    example: '30712345670',
    description: 'CUIT (11 dígitos, sin guiones)',
  })
  @IsString()
  @Matches(/^\d{11}$/, { message: 'El CUIT debe tener 11 dígitos numéricos' })
  cuit: string;

  @ApiProperty({
    example: 1,
    description: 'ID del rubro (nivel 1 de la taxonomia de profesiones)',
  })
  @IsInt()
  rubroId: number;

  @ApiPropertyOptional({
    example: 'seba@gmail.com',
    description: 'Código de referido (referralCode del usuario que refirió)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  referralCode?: string;
}
