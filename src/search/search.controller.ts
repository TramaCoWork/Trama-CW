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
  @ApiQuery({ name: 'category', required: false, description: 'Slug de la categoria (legacy)' })
  @ApiQuery({ name: 'city', required: false, description: 'Ciudad (busqueda parcial)' })
  @ApiQuery({ name: 'price_min', required: false, description: 'Precio minimo' })
  @ApiQuery({ name: 'price_max', required: false, description: 'Precio maximo' })
  @ApiQuery({ name: 'profession', required: false, description: 'Profesion principal (busqueda parcial)' })
  @ApiQuery({ name: 'modality', required: false, enum: ['presencial', 'online', 'ambas'], description: 'Modalidad de trabajo' })
  @ApiQuery({ name: 'industry', required: false, description: 'Rubro / industria (busqueda parcial)' })
  @ApiQuery({ name: 'years_min', required: false, type: Number, description: 'Anos de experiencia minimos' })
  @ApiQuery({ name: 'years_max', required: false, type: Number, description: 'Anos de experiencia maximos' })
  @ApiQuery({ name: 'profession_category', required: false, description: 'Slug de categoria profesional (taxonomia jerarquica)' })
  @ApiResponse({ status: 200, description: 'Lista de profesionales que coinciden con los filtros' })
  search(@Query() query: SearchQuery) {
    return this.searchService.search(query);
  }
}
