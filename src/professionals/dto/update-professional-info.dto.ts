import { IsString, IsOptional, IsEnum, IsInt, IsArray, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { WorkType } from '@prisma/client';

export class UpdateProfessionalInfoDto {
  @ApiPropertyOptional({ example: 'Diseñadora UX con 5 años de experiencia', maxLength: 300, description: 'Breve descripcion de actividad' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  bio?: string;

  @ApiPropertyOptional({ example: 'Diseñadora UX/UI', description: 'Profesion principal' })
  @IsOptional()
  @IsString()
  mainProfession?: string;

  @ApiPropertyOptional({ example: 'Diseñadora freelance en agencia', description: 'Ocupacion actual' })
  @IsOptional()
  @IsString()
  currentOccupation?: string;

  @ApiPropertyOptional({ enum: WorkType, description: 'Tipo de trabajo' })
  @IsOptional()
  @IsEnum(WorkType)
  workType?: WorkType;

  @ApiPropertyOptional({ example: 'Consultora de marketing', description: 'Especificar si workType es "otro"' })
  @IsOptional()
  @IsString()
  workTypeOther?: string;

  @ApiPropertyOptional({ example: 'Tecnologia', description: 'Rubro o industria' })
  @IsOptional()
  @IsString()
  industry?: string;

  @ApiPropertyOptional({ example: 5, description: 'Anos de experiencia' })
  @IsOptional()
  @IsInt()
  yearsExperience?: number;

  @ApiPropertyOptional({ example: ['UX Design', 'UI Design'], type: [String], description: 'Servicios ofrecidos' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  services?: string[];

  @ApiPropertyOptional({ example: [1, 2], type: [Number], description: 'IDs de categorias de profesion' })
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  professionCategoryIds?: number[];
}
