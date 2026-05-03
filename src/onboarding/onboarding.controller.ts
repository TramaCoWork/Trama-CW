import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { OnboardingService } from './onboarding.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserType } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Onboarding')
@ApiBearerAuth()
@Controller('onboarding')
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.professional)
  @Get('checklist')
  @ApiOperation({ summary: 'Obtener checklist de onboarding del profesional' })
  @ApiResponse({ status: 200, description: 'Checklist con estado de cada seccion' })
  async getChecklist(@CurrentUser() user: CurrentUserType) {
    return this.onboardingService.getChecklist(user.userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.professional)
  @Post('complete')
  @ApiOperation({ summary: 'Marcar onboarding como completado' })
  @ApiResponse({ status: 201, description: 'Onboarding completado' })
  @ApiResponse({ status: 400, description: 'Perfil no alcanza el porcentaje minimo' })
  async completeOnboarding(@CurrentUser() user: CurrentUserType) {
    return this.onboardingService.completeOnboarding(user.userId);
  }
}
