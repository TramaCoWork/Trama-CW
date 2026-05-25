import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { SearchService } from './search.service';
import type { SearchQuery } from './search.service';

@ApiTags('Search')
@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @ApiOperation({ summary: 'Buscar profesionales con filtros avanzados' })
  @ApiQuery({ name: 'rubro', required: false, description: 'Slug del rubro (nivel 1 de taxonomia)' })
  @ApiQuery({ name: 'city', required: false, description: 'Ciudad (busqueda parcial)' })
  @ApiQuery({ name: 'modality', required: false, enum: ['presencial', 'online', 'ambas'], description: 'Modalidad de trabajo' })
  @ApiQuery({ name: 'industry', required: false, description: 'Rubro / industria (busqueda parcial)' })
  @ApiQuery({ name: 'years_min', required: false, type: Number, description: 'Anos de experiencia minimos' })
  @ApiQuery({ name: 'years_max', required: false, type: Number, description: 'Anos de experiencia maximos' })
  @ApiQuery({ name: 'profession_category', required: false, description: 'Slug de profesion (nivel 3 de taxonomia)' })
  @ApiQuery({ name: 'sub_rubro', required: false, description: 'Slug del sub-rubro (nivel 2 de taxonomia)' })
  @ApiQuery({ name: 'countryId', required: false, type: Number, description: 'ID del pais' })
  @ApiQuery({ name: 'provinceId', required: false, type: Number, description: 'ID de la provincia' })
  @ApiResponse({ status: 200, description: 'Lista de profesionales que coinciden con los filtros' })
  search(@Query() query: SearchQuery) {
    return this.searchService.search(query);
  }
}
