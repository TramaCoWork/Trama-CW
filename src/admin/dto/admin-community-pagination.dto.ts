import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

export class AdminCommunityPaginationDto extends PaginationDto {
  @ApiPropertyOptional({
    default: 10,
    minimum: 1,
    description: 'Cantidad de resultados por pagina',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  override limit = 10;

  @ApiPropertyOptional({
    description: 'Slug del canal para filtrar posts',
    example: 'general',
  })
  @IsOptional()
  @IsString()
  channelSlug?: string;
}
