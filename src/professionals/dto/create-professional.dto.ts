import {
  IsArray,
  IsDecimal,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateProfessionalDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsString()
  photo?: string;

  @IsArray()
  @IsString({ each: true })
  services: string[];

  @IsOptional()
  @IsDecimal()
  priceMin?: string;

  @IsOptional()
  @IsDecimal()
  priceMax?: string;

  @IsString()
  city: string;

  @IsArray()
  @IsInt({ each: true })
  categories: number[];

  @IsOptional()
  @IsString()
  whatsapp?: string;

  @IsOptional()
  @IsEmail()
  emailContact?: string;
}
