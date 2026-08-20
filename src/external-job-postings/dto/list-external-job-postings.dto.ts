import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class ListExternalJobPostingsDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Filtrar por fuente (e.g. "getonboard")' })
  @IsOptional()
  @IsString()
  source?: string;

  @ApiPropertyOptional({ description: 'Filtrar por categoría (substring, case-insensitive)' })
  @IsOptional()
  @IsString()
  categoryName?: string;
}
