import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { ApiOperation, ApiTags, ApiResponse, ApiParam } from '@nestjs/swagger';
import { ProfessionCategoriesService } from './profession-categories.service';

@ApiTags('Profession Categories')
@Controller('profession-categories')
export class ProfessionCategoriesController {
  constructor(private readonly service: ProfessionCategoriesService) {}

  @Get()
  @ApiOperation({
    summary: 'Obtener arbol completo de categorias profesionales (3 niveles)',
  })
  @ApiResponse({
    status: 200,
    description: 'Arbol jerarquico: rubros → sub-rubros → profesiones',
  })
  findAll() {
    return this.service.findAll();
  }

  @Get('rubros')
  @ApiOperation({
    summary: 'Obtener rubros (nivel 1) para selector de registro',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de rubros: { id, slug, name }[]',
  })
  findRubros() {
    return this.service.findRubros();
  }

  @Get(':rubroId/professions')
  @ApiOperation({
    summary: 'Obtener profesiones de un rubro agrupadas por sub-rubro',
  })
  @ApiParam({
    name: 'rubroId',
    type: Number,
    description: 'ID del rubro (nivel 1)',
  })
  @ApiResponse({
    status: 200,
    description: 'Sub-rubros con sus profesiones (nivel 3)',
  })
  @ApiResponse({ status: 404, description: 'Rubro no encontrado' })
  findProfessionsByRubro(@Param('rubroId', ParseIntPipe) rubroId: number) {
    return this.service.findProfessionsByRubro(rubroId);
  }

  @Get(':parentId/children')
  @ApiOperation({ summary: 'Obtener subcategorias de una categoria padre' })
  @ApiParam({
    name: 'parentId',
    type: Number,
    description: 'ID de la categoria padre',
  })
  @ApiResponse({ status: 200, description: 'Lista de subcategorias' })
  findChildren(@Param('parentId', ParseIntPipe) parentId: number) {
    return this.service.findChildren(parentId);
  }
}
