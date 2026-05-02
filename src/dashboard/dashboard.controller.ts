import { Controller, Get, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserType } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getMe(@CurrentUser() user: CurrentUserType) {
    return this.dashboardService.getMe(user.userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.professional)
  @Get('contacts')
  async getContacts(@CurrentUser() user: CurrentUserType) {
    return this.dashboardService.getContacts(user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('jobs')
  async getJobs(@CurrentUser() user: CurrentUserType) {
    return this.dashboardService.getJobs(user.userId);
  }
}
