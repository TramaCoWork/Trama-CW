import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  ValidationPipe,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { DiscountsService } from './discounts.service';
import { CreateDiscountDto } from './dto/create-discount.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserType } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Admin - Discounts')
@ApiBearerAuth()
@Controller('admin/discounts')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.admin)
export class DiscountsController {
  constructor(private readonly discountsService: DiscountsService) {}

  @Post()
  @ApiOperation({ summary: 'Crear descuento para un profesional' })
  @ApiResponse({ status: 201, description: 'Descuento creado' })
  @ApiResponse({ status: 400, description: 'Datos inválidos o descuento solapado' })
  @ApiResponse({ status: 404, description: 'Profesional no encontrado' })
  async create(
    @CurrentUser() user: CurrentUserType,
    @Body(new ValidationPipe({ whitelist: true, transform: true })) dto: CreateDiscountDto,
  ) {
    return this.discountsService.create(user.userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar descuentos' })
  @ApiQuery({ name: 'professionalId', required: false, type: String, description: 'Filtrar por profesional' })
  @ApiQuery({ name: 'active', required: false, type: Boolean, description: 'Solo descuentos activos (no restaurados y no vencidos)' })
  @ApiResponse({ status: 200, description: 'Lista de descuentos' })
  async findAll(
    @Query('professionalId') professionalId?: string,
    @Query('active') active?: string,
  ) {
    return this.discountsService.findAll({
      professionalId,
      active: active !== undefined ? active === 'true' : undefined,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Ver detalle de un descuento' })
  @ApiResponse({ status: 200, description: 'Detalle del descuento' })
  @ApiResponse({ status: 404, description: 'Descuento no encontrado' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.discountsService.findOne(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar descuento (solo si no fue aplicado)' })
  @ApiResponse({ status: 200, description: 'Descuento eliminado' })
  @ApiResponse({ status: 400, description: 'No se puede eliminar un descuento ya aplicado' })
  @ApiResponse({ status: 404, description: 'Descuento no encontrado' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.discountsService.remove(id);
  }
}
