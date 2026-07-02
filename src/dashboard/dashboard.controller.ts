import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiOkResponse,
} from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserType } from '../auth/decorators/current-user.decorator';
import { ProfessionalDashboardDto } from './dto/professional-dashboard.dto';

@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @UseGuards(JwtAuthGuard)
  @Get('me')
  @ApiOperation({ summary: 'Obtener datos del usuario actual' })
  @ApiResponse({ status: 200, description: 'Datos del usuario con perfil' })
  async getMe(@CurrentUser() user: CurrentUserType) {
    return this.dashboardService.getMe(user.userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('professional')
  @Get('contacts')
  @ApiOperation({ summary: 'Obtener contactos recibidos del profesional' })
  @ApiResponse({ status: 200, description: 'Lista de contactos' })
  async getContacts(@CurrentUser() user: CurrentUserType) {
    return this.dashboardService.getContacts(user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('jobs')
  @ApiOperation({ summary: 'Obtener trabajos a los que aplico el usuario' })
  @ApiResponse({ status: 200, description: 'Lista de aplicaciones a trabajos' })
  async getJobs(@CurrentUser() user: CurrentUserType) {
    return this.dashboardService.getJobs(user.userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('professional')
  @Get('professional')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Obtener totalizadores y plan del profesional autenticado',
  })
  @ApiOkResponse({ type: ProfessionalDashboardDto })
  async getProfessionalDashboard(@CurrentUser() user: CurrentUserType) {
    return this.dashboardService.getProfessionalDashboard(user.userId);
  }
}
