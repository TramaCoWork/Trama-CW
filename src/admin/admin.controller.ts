import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { CreateJobDto } from './dto/create-job.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.admin)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('professionals/pending')
  async getPendingProfessionals() {
    return this.adminService.getPendingProfessionals();
  }

  @Post('professionals/:id/approve')
  async approveProfessional(@Param('id') id: string) {
    return this.adminService.approveProfessional(id);
  }

  @Post('jobs')
  async createJob(@Body(new ValidationPipe()) dto: CreateJobDto) {
    return this.adminService.createJob(dto);
  }

  @Get('payments')
  async getPayments() {
    return this.adminService.getPayments();
  }
}
