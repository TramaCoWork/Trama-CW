import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateProfesionDto } from './dto/create-profesion.dto';
import { CreateRubroDto } from './dto/create-rubro.dto';
import { CreateSubrubroDto } from './dto/create-subrubro.dto';
import { UpdateProfesionDto } from './dto/update-profesion.dto';
import { UpdateRubroDto } from './dto/update-rubro.dto';
import { UpdateSubrubroDto } from './dto/update-subrubro.dto';
import { ProfessionCategoriesService } from './profession-categories.service';

@ApiTags('Admin - Profession Categories')
@ApiBearerAuth()
@Controller('admin/profession-categories')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminProfessionCategoriesController {
  constructor(private readonly service: ProfessionCategoriesService) {}

  @Get('rubros')
  @ApiOperation({ summary: 'Listar rubros (admin)' })
  findRubros() {
    return this.service.adminFindRubros();
  }

  @Get('rubros/:id')
  @ApiOperation({ summary: 'Ver detalle de rubro' })
  findRubro(@Param('id', ParseIntPipe) id: number) {
    return this.service.adminFindRubro(id);
  }

  @Post('rubros')
  @ApiOperation({ summary: 'Crear rubro' })
  createRubro(@Body(new ValidationPipe({ whitelist: true, transform: true })) dto: CreateRubroDto) {
    return this.service.adminCreateRubro(dto);
  }

  @Patch('rubros/:id')
  @ApiOperation({ summary: 'Actualizar rubro' })
  updateRubro(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ValidationPipe({ whitelist: true, transform: true })) dto: UpdateRubroDto,
  ) {
    return this.service.adminUpdateRubro(id, dto);
  }

  @Delete('rubros/:id')
  @ApiOperation({ summary: 'Desactivar rubro (solo sin subrubros activos)' })
  removeRubro(@Param('id', ParseIntPipe) id: number) {
    return this.service.adminDeactivateRubro(id);
  }

  @Get('subrubros')
  @ApiOperation({ summary: 'Listar subrubros (admin)' })
  @ApiQuery({ name: 'rubroId', required: false, type: Number })
  findSubrubros(@Query('rubroId', new ParseIntPipe({ optional: true })) rubroId?: number) {
    return this.service.adminFindSubrubros(rubroId);
  }

  @Get('subrubros/:id')
  @ApiOperation({ summary: 'Ver detalle de subrubro' })
  findSubrubro(@Param('id', ParseIntPipe) id: number) {
    return this.service.adminFindSubrubro(id);
  }

  @Post('subrubros')
  @ApiOperation({ summary: 'Crear subrubro' })
  createSubrubro(
    @Body(new ValidationPipe({ whitelist: true, transform: true })) dto: CreateSubrubroDto,
  ) {
    return this.service.adminCreateSubrubro(dto);
  }

  @Patch('subrubros/:id')
  @ApiOperation({ summary: 'Actualizar subrubro' })
  updateSubrubro(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ValidationPipe({ whitelist: true, transform: true })) dto: UpdateSubrubroDto,
  ) {
    return this.service.adminUpdateSubrubro(id, dto);
  }

  @Delete('subrubros/:id')
  @ApiOperation({ summary: 'Desactivar subrubro (solo sin profesiones activas)' })
  removeSubrubro(@Param('id', ParseIntPipe) id: number) {
    return this.service.adminDeactivateSubrubro(id);
  }

  @Get('profesiones')
  @ApiOperation({ summary: 'Listar profesiones (admin)' })
  @ApiQuery({ name: 'subrubroId', required: false, type: Number })
  findProfesiones(@Query('subrubroId', new ParseIntPipe({ optional: true })) subrubroId?: number) {
    return this.service.adminFindProfesiones(subrubroId);
  }

  @Get('profesiones/:id')
  @ApiOperation({ summary: 'Ver detalle de profesion' })
  findProfesion(@Param('id', ParseIntPipe) id: number) {
    return this.service.adminFindProfesion(id);
  }

  @Post('profesiones')
  @ApiOperation({ summary: 'Crear profesion' })
  createProfesion(
    @Body(new ValidationPipe({ whitelist: true, transform: true })) dto: CreateProfesionDto,
  ) {
    return this.service.adminCreateProfesion(dto);
  }

  @Patch('profesiones/:id')
  @ApiOperation({ summary: 'Actualizar profesion' })
  updateProfesion(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ValidationPipe({ whitelist: true, transform: true })) dto: UpdateProfesionDto,
  ) {
    return this.service.adminUpdateProfesion(id, dto);
  }

  @Delete('profesiones/:id')
  @ApiOperation({ summary: 'Desactivar profesion (solo sin referencias activas)' })
  removeProfesion(@Param('id', ParseIntPipe) id: number) {
    return this.service.adminDeactivateProfesion(id);
  }
}
