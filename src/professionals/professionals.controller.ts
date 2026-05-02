import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ApiQuery, ApiOkResponse, ApiProperty, ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ProfessionalsService } from './professionals.service';
import { CreateProfessionalDto } from './dto/create-professional.dto';
import { UpdateProfessionalDto } from './dto/update-professional.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserType } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

class ProfessionalItem {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty({ required: false, nullable: true }) bio: string | null;
  @ApiProperty({ required: false, nullable: true }) photo: string | null;
  @ApiProperty({ type: [String] }) services: string[];
  @ApiProperty({ required: false, nullable: true }) priceMin: string | null;
  @ApiProperty({ required: false, nullable: true }) priceMax: string | null;
  @ApiProperty({ required: false, nullable: true }) city: string | null;
  @ApiProperty({ required: false, nullable: true }) whatsapp: string | null;
  @ApiProperty({ required: false, nullable: true }) emailContact: string | null;
  @ApiProperty() completionPct: number;
  @ApiProperty() isActive: boolean;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}

class PaginatedProfessionalsResponse {
  @ApiProperty({ type: [ProfessionalItem] }) data: ProfessionalItem[];
  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() sizePage: number;
}

@Controller('professionals')
export class ProfessionalsController {
  constructor(private readonly professionalsService: ProfessionalsService) {}

  @Get()
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Página actual (default: 1)' })
  @ApiQuery({ name: 'sizePage', required: false, type: Number, description: 'Resultados por página (default: 10)' })
  @ApiOkResponse({ type: PaginatedProfessionalsResponse })
  findAll(
    @Query('page') page = 1,
    @Query('sizePage') sizePage = 10,
  ) {
    return this.professionalsService.findAll(Number(page), Number(sizePage));
  }

  @Get('featured')
  findFeatured() {
    return this.professionalsService.findFeatured();
  }

  @Get('by-user/:userId')
  @UseGuards(JwtAuthGuard)
  findByUserId(@Param('userId') userId: string) {
    return this.professionalsService.findByUserId(userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.professionalsService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.professional)
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  create(
    @CurrentUser() user: CurrentUserType,
    @Body() dto: CreateProfessionalDto,
  ) {
    return this.professionalsService.create(user.userId, dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.professional)
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  update(
    @CurrentUser() user: CurrentUserType,
    @Param('id') id: string,
    @Body() dto: UpdateProfessionalDto,
  ) {
    return this.professionalsService.update(user.userId, id, dto);
  }
}
