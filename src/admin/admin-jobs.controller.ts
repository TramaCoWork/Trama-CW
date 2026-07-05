import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiProperty,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JobStatus } from '@prisma/client';
import { IsIn } from 'class-validator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PaginationDto } from '../common/dto/pagination.dto';
import { CreateJobDto } from '../jobs/dto/create-job.dto';
import { UpdateJobDto } from '../jobs/dto/update-job.dto';
import { AdminJobsService } from './admin-jobs.service';

class UpdateJobStatusDto {
  @ApiProperty({ enum: [JobStatus.active, JobStatus.paused] })
  @IsIn([JobStatus.active, JobStatus.paused])
  status!: 'active' | 'paused';
}

@ApiTags('Admin Jobs')
@ApiBearerAuth()
@Controller('admin/work')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminJobsController {
  constructor(private readonly adminJobsService: AdminJobsService) {}

  @Post()
  @ApiOperation({ summary: 'Crear vacante' })
  @ApiResponse({ status: 201, description: 'Vacante creada' })
  createJob(
    @Body(new ValidationPipe({ whitelist: true, transform: true }))
    dto: CreateJobDto,
  ) {
    return this.adminJobsService.createJob(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar vacantes (admin)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: [JobStatus.active, JobStatus.paused],
  })
  @ApiQuery({ name: 'categoryId', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Lista paginada de vacantes' })
  listJobs(
    @Query() pagination: PaginationDto,
    @Query('status') status?: 'active' | 'paused',
    @Query('categoryId', new ParseIntPipe({ optional: true }))
    categoryId?: number,
  ) {
    return this.adminJobsService.listJobs(pagination, status, categoryId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener vacante por ID' })
  @ApiParam({ name: 'id', description: 'ID de la vacante' })
  @ApiResponse({ status: 200, description: 'Vacante encontrada' })
  @ApiResponse({ status: 404, description: 'Vacante no encontrada' })
  getJobById(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminJobsService.getJobById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar vacante por ID' })
  @ApiParam({ name: 'id', description: 'ID de la vacante' })
  @ApiResponse({ status: 200, description: 'Vacante actualizada' })
  @ApiResponse({ status: 404, description: 'Vacante no encontrada' })
  updateJob(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ValidationPipe({ whitelist: true, transform: true }))
    dto: UpdateJobDto,
  ) {
    return this.adminJobsService.updateJob(id, dto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Actualizar status de vacante' })
  @ApiParam({ name: 'id', description: 'ID de la vacante' })
  @ApiResponse({ status: 200, description: 'Status actualizado' })
  @ApiResponse({ status: 404, description: 'Vacante no encontrada' })
  updateJobStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ValidationPipe({ whitelist: true, transform: true }))
    dto: UpdateJobStatusDto,
  ) {
    return this.adminJobsService.updateJobStatus(id, dto.status);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Borrado logico de vacante' })
  @ApiParam({ name: 'id', description: 'ID de la vacante' })
  @ApiResponse({ status: 200, description: 'Vacante eliminada logicamente' })
  @ApiResponse({ status: 404, description: 'Vacante no encontrada' })
  deleteJob(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminJobsService.softDeleteJob(id);
  }

  @Get(':id/applications')
  @ApiOperation({ summary: 'Listar postulaciones de una vacante' })
  @ApiParam({ name: 'id', description: 'ID de la vacante' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Lista paginada de postulaciones' })
  @ApiResponse({ status: 404, description: 'Vacante no encontrada' })
  listJobApplications(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.adminJobsService.listJobApplications(id, pagination);
  }
}
