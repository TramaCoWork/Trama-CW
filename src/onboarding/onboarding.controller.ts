import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { OnboardingService } from './onboarding.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserType } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@Controller('onboarding')
export class OnboardingController {
  constructor(private readonly onboardingService: OnboardingService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.professional)
  @Get('checklist')
  async getChecklist(@CurrentUser() user: CurrentUserType) {
    return this.onboardingService.getChecklist(user.userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.professional)
  @Post('complete')
  async completeOnboarding(@CurrentUser() user: CurrentUserType) {
    return this.onboardingService.completeOnboarding(user.userId);
  }
}
