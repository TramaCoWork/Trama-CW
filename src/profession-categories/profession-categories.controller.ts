import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { ApiOperation, ApiTags, ApiResponse, ApiParam } from '@nestjs/swagger';
import { ProfessionCategoriesService } from './profession-categories.service';

@ApiTags('Profession Categories')
@Controller('profession-categories')
export class ProfessionCategoriesController {
  constructor(private readonly service: ProfessionCategoriesService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener arbol completo de categorias profesionales (3 niveles)' })
  @ApiResponse({ status: 200, description: 'Arbol jerarquico de categorias con subcategorias y profesiones' })
  findAll() {
    return this.service.findAll();
  }

  @Get(':parentId/children')
  @ApiOperation({ summary: 'Obtener subcategorias de una categoria padre' })
  @ApiParam({ name: 'parentId', type: Number, description: 'ID de la categoria padre' })
  @ApiResponse({ status: 200, description: 'Lista de subcategorias' })
  findChildren(@Param('parentId', ParseIntPipe) parentId: number) {
    return this.service.findChildren(parentId);
  }
}
