import {
  Body,
  Controller,
  Get,
  Headers,
  Post,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JobsService } from './jobs.service';
import { PaginationDto } from '../common/dto/pagination.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserType } from '../auth/decorators/current-user.decorator';
import { ApplyJobDto } from './dto/apply-job.dto';

@ApiTags('Jobs')
@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar trabajos activos vigentes' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'categoryIds', required: false, type: [Number] })
  @ApiResponse({ status: 200, description: 'Lista paginada de trabajos activos' })
  listPublicJobs(
    @Query() pagination: PaginationDto,
    @Query('categoryIds') rawCategoryIds?: string,
    @Headers('authorization') authorization?: string,
  ) {
    const categoryIds = this.parseCategoryIds(rawCategoryIds);
    return this.jobsService.listPublicJobs(
      pagination,
      categoryIds,
      authorization,
    );
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('my-applications')
  @ApiOperation({ summary: 'Listar mis postulaciones' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Lista paginada de postulaciones del usuario actual' })
  listMyApplications(
    @CurrentUser() user: CurrentUserType,
    @Query() pagination: PaginationDto,
  ) {
    return this.jobsService.listMyApplications(user.userId, pagination);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get(':id')
  @ApiOperation({ summary: 'Obtener trabajo activo vigente por ID e incrementar clickCount' })
  @ApiParam({ name: 'id', description: 'ID del trabajo' })
  @ApiResponse({ status: 200, description: 'Trabajo encontrado' })
  @ApiResponse({ status: 404, description: 'Trabajo no encontrado' })
  @ApiResponse({ status: 403, description: 'Trabajo no disponible' })
  getPublicJobById(@Param('id', ParseUUIDPipe) id: string) {
    return this.jobsService.getPublicJobById(id);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post(':id/apply')
  @ApiOperation({ summary: 'Postularse a un trabajo activo vigente' })
  @ApiParam({ name: 'id', description: 'ID del trabajo' })
  @ApiBody({ type: ApplyJobDto })
  @ApiResponse({ status: 201, description: 'Postulacion creada' })
  @ApiResponse({ status: 404, description: 'Trabajo no encontrado' })
  @ApiResponse({ status: 403, description: 'Trabajo no disponible' })
  @ApiResponse({ status: 409, description: 'Ya aplicaste a este trabajo' })
  apply(
    @CurrentUser() user: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApplyJobDto,
  ) {
    return this.jobsService.apply(user.userId, id, dto);
  }

  private parseCategoryIds(rawCategoryIds?: string): number[] {
    if (!rawCategoryIds) {
      return [];
    }

    return rawCategoryIds
      .split(',')
      .map((value) => Number.parseInt(value.trim(), 10))
      .filter((value) => Number.isInteger(value));
  }
}
