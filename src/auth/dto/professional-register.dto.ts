import { IsArray, IsInt, IsOptional, IsString } from 'class-validator';
import { RegisterDto } from './register.dto';

export class ProfessionalRegisterDto extends RegisterDto {
  @IsString()
  name: string;

  @IsString()
  city: string;

  @IsArray()
  @IsInt({ each: true })
  categories: number[];

  @IsOptional()
  @IsString()
  whatsapp?: string;
}
