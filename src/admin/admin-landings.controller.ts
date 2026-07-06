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
import {
  ApiProperty,
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateLandingDto } from '../landings/dto/create-landing.dto';
import { UpdateLandingDto } from '../landings/dto/update-landing.dto';
import { CreateFieldDto } from '../landings/dto/create-field.dto';
import { UpdateFieldDto } from '../landings/dto/update-field.dto';
import { AdminLandingsService } from './admin-landings.service';
import { PaginationDto } from '../common/dto/pagination.dto';
import { IsArray, IsInt } from 'class-validator';

class ReorderLandingFieldsDto {
  @ApiProperty({ type: [Number] })
  @IsArray()
  @IsInt({ each: true })
  fieldIds!: number[];
}

@ApiTags('Admin - Landings')
@ApiBearerAuth()
@Controller('admin/landings')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminLandingsController {
  constructor(private readonly adminLandingsService: AdminLandingsService) {}

  @Post()
  @ApiOperation({ summary: 'Crear landing' })
  @ApiResponse({ status: 201, description: 'Landing creada' })
  createLanding(
    @Body(new ValidationPipe({ whitelist: true, transform: true }))
    dto: CreateLandingDto,
  ) {
    return this.adminLandingsService.createLanding(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar landings (paginado)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Listado paginado de landings' })
  listLandings(@Query() pagination: PaginationDto) {
    return this.adminLandingsService.listLandings(
      pagination.page,
      pagination.limit,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener landing con campos' })
  @ApiParam({ name: 'id', description: 'ID de la landing' })
  @ApiResponse({ status: 200, description: 'Landing encontrada' })
  @ApiResponse({ status: 404, description: 'Landing no encontrada' })
  getLanding(@Param('id', ParseIntPipe) id: number) {
    return this.adminLandingsService.getLanding(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar landing' })
  @ApiParam({ name: 'id', description: 'ID de la landing' })
  @ApiResponse({ status: 200, description: 'Landing actualizada' })
  updateLanding(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ValidationPipe({ whitelist: true, transform: true }))
    dto: UpdateLandingDto,
  ) {
    return this.adminLandingsService.updateLanding(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar landing (soft-delete)' })
  @ApiParam({ name: 'id', description: 'ID de la landing' })
  @ApiResponse({ status: 200, description: 'Landing eliminada' })
  deleteLanding(@Param('id', ParseIntPipe) id: number) {
    return this.adminLandingsService.deleteLanding(id);
  }

  @Post(':id/fields')
  @ApiOperation({ summary: 'Agregar campo a la landing' })
  @ApiParam({ name: 'id', description: 'ID de la landing' })
  @ApiResponse({ status: 201, description: 'Campo agregado' })
  addField(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ValidationPipe({ whitelist: true, transform: true }))
    dto: CreateFieldDto,
  ) {
    return this.adminLandingsService.addField(id, dto);
  }

  @Patch(':id/fields/:fieldId')
  @ApiOperation({ summary: 'Actualizar campo de la landing' })
  @ApiParam({ name: 'id', description: 'ID de la landing' })
  @ApiParam({ name: 'fieldId', description: 'ID del campo' })
  @ApiResponse({ status: 200, description: 'Campo actualizado' })
  updateField(
    @Param('id', ParseIntPipe) id: number,
    @Param('fieldId', ParseIntPipe) fieldId: number,
    @Body(new ValidationPipe({ whitelist: true, transform: true }))
    dto: UpdateFieldDto,
  ) {
    return this.adminLandingsService.updateField(id, fieldId, dto);
  }

  @Delete(':id/fields/:fieldId')
  @ApiOperation({ summary: 'Eliminar campo de la landing' })
  @ApiParam({ name: 'id', description: 'ID de la landing' })
  @ApiParam({ name: 'fieldId', description: 'ID del campo' })
  @ApiResponse({ status: 200, description: 'Campo eliminado' })
  deleteField(
    @Param('id', ParseIntPipe) id: number,
    @Param('fieldId', ParseIntPipe) fieldId: number,
  ) {
    return this.adminLandingsService.deleteField(id, fieldId);
  }

  @Patch(':id/fields/reorder')
  @ApiOperation({ summary: 'Reordenar campos de la landing' })
  @ApiParam({ name: 'id', description: 'ID de la landing' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        fieldIds: { type: 'array', items: { type: 'number' } },
      },
      required: ['fieldIds'],
    },
  })
  @ApiResponse({ status: 200, description: 'Campos reordenados' })
  reorderFields(
    @Param('id', ParseIntPipe) id: number,
    @Body(new ValidationPipe({ whitelist: true, transform: true }))
    dto: ReorderLandingFieldsDto,
  ) {
    return this.adminLandingsService.reorderFields(id, dto.fieldIds);
  }

  @Get(':id/submissions')
  @ApiOperation({ summary: 'Listar envíos de una landing (paginado)' })
  @ApiParam({ name: 'id', description: 'ID de la landing' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Listado paginado de envíos' })
  listSubmissions(
    @Param('id', ParseIntPipe) id: number,
    @Query() pagination: PaginationDto,
  ) {
    return this.adminLandingsService.listSubmissions(
      id,
      pagination.page,
      pagination.limit,
    );
  }

  @Delete(':id/submissions/:subId')
  @ApiOperation({ summary: 'Eliminar envío de una landing' })
  @ApiParam({ name: 'id', description: 'ID de la landing' })
  @ApiParam({ name: 'subId', description: 'ID del envío' })
  @ApiResponse({ status: 200, description: 'Envío eliminado' })
  deleteSubmission(
    @Param('id', ParseIntPipe) id: number,
    @Param('subId', ParseIntPipe) subId: number,
  ) {
    return this.adminLandingsService.deleteSubmission(id, subId);
  }
}
