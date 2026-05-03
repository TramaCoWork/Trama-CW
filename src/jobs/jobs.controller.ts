import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JobsService } from './jobs.service';
import { ApplyJobDto } from './dto/apply-job.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserType } from '../auth/decorators/current-user.decorator';

@ApiTags('Jobs')
@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar trabajos activos' })
  @ApiResponse({ status: 200, description: 'Lista de trabajos disponibles' })
  async findAll() {
    return this.jobsService.findAll();
  }

  @Post('apply')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Aplicar a un trabajo' })
  @ApiResponse({ status: 201, description: 'Aplicacion enviada' })
  @ApiResponse({ status: 409, description: 'Ya aplicaste a este trabajo' })
  async apply(
    @CurrentUser() user: CurrentUserType,
    @Body() dto: ApplyJobDto,
  ) {
    return this.jobsService.apply(user.userId, dto);
  }
}
