import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class ListExternalJobPostingsDto extends PaginationDto {
  // Override inherited limit to cap at 100 for this endpoint
  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100, description: 'Cantidad de resultados por pagina (máximo 100)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 20;

  @ApiPropertyOptional({ description: 'Filtrar por fuente (e.g. "getonboard")' })
  @IsOptional()
  @IsString()
  source?: string;

  @ApiPropertyOptional({ description: 'Filtrar por categoría (substring, case-insensitive)' })
  @IsOptional()
  @IsString()
  categoryName?: string;

  @ApiPropertyOptional({ description: 'Búsqueda libre por título o categoría (case-insensitive)' })
  @IsOptional()
  @IsString()
  q?: string;
}
