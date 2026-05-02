import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { ApplyJobDto } from './dto/apply-job.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserType } from '../auth/decorators/current-user.decorator';

@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Get()
  async findAll() {
    return this.jobsService.findAll();
  }

  @Post('apply')
  @UseGuards(JwtAuthGuard)
  async apply(
    @CurrentUser() user: CurrentUserType,
    @Body() dto: ApplyJobDto,
  ) {
    return this.jobsService.apply(user.userId, dto);
  }
}
