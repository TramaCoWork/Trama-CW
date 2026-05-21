import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  UsePipes,
  ValidationPipe,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiOkResponse,
  ApiProperty,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { ProfessionalsService } from './professionals.service';
import { CreateProfessionalDto } from './dto/create-professional.dto';
import { UpdateProfessionalDto } from './dto/update-professional.dto';
import { UpdatePersonalDto } from './dto/update-personal.dto';
import { UpdateProfessionalInfoDto } from './dto/update-professional-info.dto';
import { CreateEducationDto } from './dto/create-education.dto';
import { CreateCertificationDto } from './dto/create-certification.dto';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';
import { UpdateMotivationDto } from './dto/update-motivation.dto';
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
  @ApiProperty({ required: false, nullable: true }) address: string | null;
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

@ApiTags('Professionals')
@Controller('professionals')
export class ProfessionalsController {
  constructor(private readonly professionalsService: ProfessionalsService) {}

  // ─── Queries publicas ────────────────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'Listar profesionales activos (paginado)' })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Pagina actual (default: 1)',
  })
  @ApiQuery({
    name: 'sizePage',
    required: false,
    type: Number,
    description: 'Resultados por pagina (default: 10)',
  })
  @ApiOkResponse({ type: PaginatedProfessionalsResponse })
  findAll(@Query('page') page = 1, @Query('sizePage') sizePage = 10) {
    return this.professionalsService.findAll(Number(page), Number(sizePage));
  }

  @Get('featured')
  @ApiOperation({ summary: 'Obtener 6 profesionales destacados al azar' })
  @ApiResponse({
    status: 200,
    description: 'Lista de profesionales destacados',
  })
  findFeatured() {
    return this.professionalsService.findFeatured();
  }

  @Get('by-user/:userId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Obtener perfil completo por userId (incluye educacion, certificaciones, documentos)',
  })
  @ApiResponse({ status: 200, description: 'Perfil completo del profesional' })
  @ApiResponse({ status: 404, description: 'Perfil no encontrado' })
  findByUserId(@Param('userId') userId: string) {
    return this.professionalsService.findByUserId(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener perfil profesional por ID' })
  @ApiResponse({ status: 200, description: 'Perfil del profesional' })
  @ApiResponse({ status: 404, description: 'Profesional no encontrado' })
  findOne(@Param('id') id: string) {
    return this.professionalsService.findOne(id);
  }

  // ─── Create / Update generico (legacy) ───────────────────────────────────

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.professional)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Crear perfil profesional (legacy)' })
  @ApiResponse({ status: 201, description: 'Perfil creado exitosamente' })
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
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Actualizar perfil profesional (legacy)' })
  @ApiResponse({ status: 200, description: 'Perfil actualizado' })
  @ApiResponse({ status: 403, description: 'No es propietario del perfil' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  update(
    @CurrentUser() user: CurrentUserType,
    @Param('id') id: string,
    @Body() dto: UpdateProfessionalDto,
  ) {
    return this.professionalsService.update(user.userId, id, dto);
  }

  // ─── Seccion 1: Datos personales ────────────────────────────────────────

  @Patch(':id/personal')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.professional)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Actualizar datos personales (seccion 1)' })
  @ApiResponse({ status: 200, description: 'Datos personales actualizados' })
  @ApiResponse({ status: 403, description: 'No es propietario del perfil' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  updatePersonal(
    @CurrentUser() user: CurrentUserType,
    @Param('id') id: string,
    @Body() dto: UpdatePersonalDto,
  ) {
    return this.professionalsService.updatePersonal(user.userId, id, dto);
  }

  // ─── Seccion 2: Perfil profesional ──────────────────────────────────────

  @Patch(':id/professional')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.professional)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Actualizar perfil profesional (seccion 2)' })
  @ApiResponse({ status: 200, description: 'Perfil profesional actualizado' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  updateProfessionalInfo(
    @CurrentUser() user: CurrentUserType,
    @Param('id') id: string,
    @Body() dto: UpdateProfessionalInfoDto,
  ) {
    return this.professionalsService.updateProfessionalInfo(
      user.userId,
      id,
      dto,
    );
  }

  // ─── Seccion 3: Formacion academica ─────────────────────────────────────

  @Get(':id/education')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.professional)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar formacion academica del perfil' })
  @ApiResponse({
    status: 200,
    description: 'Lista de formaciones con documentos adjuntos',
  })
  getEducations(@CurrentUser() user: CurrentUserType, @Param('id') id: string) {
    return this.professionalsService.getEducations(user.userId, id);
  }

  @Post(':id/education')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.professional)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Agregar formacion academica (seccion 3)' })
  @ApiResponse({ status: 201, description: 'Formacion agregada' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  addEducation(
    @CurrentUser() user: CurrentUserType,
    @Param('id') id: string,
    @Body() dto: CreateEducationDto,
  ) {
    return this.professionalsService.addEducation(user.userId, id, dto);
  }

  @Patch(':id/education/:educationId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.professional)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Editar formacion academica' })
  @ApiResponse({ status: 200, description: 'Formacion actualizada' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  updateEducation(
    @CurrentUser() user: CurrentUserType,
    @Param('id') id: string,
    @Param('educationId') educationId: string,
    @Body() dto: CreateEducationDto,
  ) {
    return this.professionalsService.updateEducation(
      user.userId,
      id,
      educationId,
      dto,
    );
  }

  @Delete(':id/education/:educationId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.professional)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Eliminar formacion academica' })
  @ApiResponse({ status: 200, description: 'Formacion eliminada' })
  deleteEducation(
    @CurrentUser() user: CurrentUserType,
    @Param('id') id: string,
    @Param('educationId') educationId: string,
  ) {
    return this.professionalsService.deleteEducation(
      user.userId,
      id,
      educationId,
    );
  }

  // ─── Seccion 4: Certificaciones ─────────────────────────────────────────

  @Get(':id/certifications')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.professional)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Listar certificaciones del perfil' })
  @ApiResponse({
    status: 200,
    description: 'Lista de certificaciones con documentos adjuntos',
  })
  getCertifications(
    @CurrentUser() user: CurrentUserType,
    @Param('id') id: string,
  ) {
    return this.professionalsService.getCertifications(user.userId, id);
  }

  @Post(':id/certifications')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.professional)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Agregar certificacion (seccion 4)' })
  @ApiResponse({ status: 201, description: 'Certificacion agregada' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  addCertification(
    @CurrentUser() user: CurrentUserType,
    @Param('id') id: string,
    @Body() dto: CreateCertificationDto,
  ) {
    return this.professionalsService.addCertification(user.userId, id, dto);
  }

  @Patch(':id/certifications/:certId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.professional)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Editar certificacion' })
  @ApiResponse({ status: 200, description: 'Certificacion actualizada' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  updateCertification(
    @CurrentUser() user: CurrentUserType,
    @Param('id') id: string,
    @Param('certId') certId: string,
    @Body() dto: CreateCertificationDto,
  ) {
    return this.professionalsService.updateCertification(
      user.userId,
      id,
      certId,
      dto,
    );
  }

  @Delete(':id/certifications/:certId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.professional)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Eliminar certificacion' })
  @ApiResponse({ status: 200, description: 'Certificacion eliminada' })
  deleteCertification(
    @CurrentUser() user: CurrentUserType,
    @Param('id') id: string,
    @Param('certId') certId: string,
  ) {
    return this.professionalsService.deleteCertification(
      user.userId,
      id,
      certId,
    );
  }

  // ─── Seccion 6+7: Intereses y modalidad ─────────────────────────────────

  @Patch(':id/preferences')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.professional)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Actualizar intereses y modalidad de uso (secciones 6+7)',
  })
  @ApiResponse({ status: 200, description: 'Preferencias actualizadas' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  updatePreferences(
    @CurrentUser() user: CurrentUserType,
    @Param('id') id: string,
    @Body() dto: UpdatePreferencesDto,
  ) {
    return this.professionalsService.updatePreferences(user.userId, id, dto);
  }

  // ─── Seccion 8: Pregunta filtro ─────────────────────────────────────────

  @Patch(':id/motivation')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.professional)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Actualizar motivacion / pregunta filtro (seccion 8)',
  })
  @ApiResponse({ status: 200, description: 'Motivacion actualizada' })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  updateMotivation(
    @CurrentUser() user: CurrentUserType,
    @Param('id') id: string,
    @Body() dto: UpdateMotivationDto,
  ) {
    return this.professionalsService.updateMotivation(user.userId, id, dto);
  }

  // ─── Seccion 9: Submit para revision ────────────────────────────────────

  @Post(':id/submit')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.professional)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Enviar perfil para revision (seccion 9 - consentimiento + submit)',
  })
  @ApiResponse({ status: 201, description: 'Perfil enviado para revision' })
  @ApiResponse({ status: 400, description: 'Faltan campos obligatorios o CV' })
  submit(@CurrentUser() user: CurrentUserType, @Param('id') id: string) {
    return this.professionalsService.submitForReview(user.userId, id);
  }
}
