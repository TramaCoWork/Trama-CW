import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateDiscountPlanDto } from './dto/create-discount-plan.dto';
import { UpdateDiscountPlanDto } from './dto/update-discount-plan.dto';
import { DiscountPlansService } from './discount-plans.service';

@ApiTags('Admin - Discount Plans')
@ApiBearerAuth()
@Controller('admin/discount-plans')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class DiscountPlansController {
  constructor(private readonly discountPlansService: DiscountPlansService) {}

  @Post()
  @ApiOperation({ summary: 'Crear discount plan' })
  @ApiResponse({ status: 201, description: 'Discount plan creado' })
  create(
    @Body(new ValidationPipe({ whitelist: true, transform: true })) dto: CreateDiscountPlanDto,
  ) {
    return this.discountPlansService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar discount plans activos (no soft-deleted)' })
  @ApiResponse({ status: 200, description: 'Lista de discount plans' })
  findAll() {
    return this.discountPlansService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un discount plan por id' })
  @ApiResponse({ status: 200, description: 'Discount plan encontrado' })
  @ApiResponse({ status: 404, description: 'Discount plan no encontrado' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.discountPlansService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar discount plan' })
  @ApiResponse({ status: 200, description: 'Discount plan actualizado' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ValidationPipe({ whitelist: true, transform: true })) dto: UpdateDiscountPlanDto,
  ) {
    return this.discountPlansService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Eliminar discount plan (soft-delete)' })
  @ApiResponse({ status: 200, description: 'Discount plan eliminado' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.discountPlansService.remove(id);
  }
}
