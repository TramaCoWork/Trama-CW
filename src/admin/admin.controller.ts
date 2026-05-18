import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  ValidationPipe,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiParam } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { CreateJobDto } from './dto/create-job.dto';
import { ValidateProfileDto } from './dto/validate-profile.dto';
import { VerifyDocumentDto } from './dto/verify-document.dto';
import { SetTrialDateDto } from './dto/set-trial-date.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserType } from '../auth/decorators/current-user.decorator';
import { UserRole, ProfileStatus, SubscriptionPaymentStatus, FrequencyType } from '@prisma/client';

@ApiTags('Admin')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.admin)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('professionals')
  @ApiOperation({ summary: 'Listar todos los profesionales (incluye inactivos y todos los estados)' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Pagina actual (default: 1)' })
  @ApiQuery({ name: 'sizePage', required: false, type: Number, description: 'Resultados por pagina (default: 10)' })
  @ApiQuery({ name: 'profileStatus', required: false, enum: ProfileStatus, description: 'Filtrar por estado del perfil' })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean, description: 'Filtrar por activo/inactivo' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Buscar por nombre o email' })
  @ApiQuery({ name: 'rubroId', required: false, type: Number, description: 'Filtrar por rubro' })
  @ApiQuery({ name: 'countryId', required: false, type: Number, description: 'Filtrar por pais' })
  @ApiQuery({ name: 'provinceId', required: false, type: Number, description: 'Filtrar por provincia' })
  @ApiResponse({ status: 200, description: 'Lista paginada de profesionales' })
  async getAllProfessionals(
    @Query('page') page = 1,
    @Query('sizePage') sizePage = 10,
    @Query('profileStatus') profileStatus?: ProfileStatus,
    @Query('isActive') isActive?: string,
    @Query('search') search?: string,
    @Query('rubroId') rubroId?: string,
    @Query('countryId') countryId?: string,
    @Query('provinceId') provinceId?: string,
  ) {
    return this.adminService.findAllProfessionals({
      page: Number(page),
      sizePage: Number(sizePage),
      profileStatus,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      search,
      rubroId: rubroId ? Number(rubroId) : undefined,
      countryId: countryId ? Number(countryId) : undefined,
      provinceId: provinceId ? Number(provinceId) : undefined,
    });
  }

  @Get('professionals/pending')
  @ApiOperation({ summary: 'Listar profesionales pendientes (incompletos / onboarding)' })
  @ApiResponse({ status: 200, description: 'Lista de profesionales pendientes' })
  async getPendingProfessionals() {
    return this.adminService.getPendingProfessionals();
  }

  @Get('professionals/pending-review')
  @ApiOperation({ summary: 'Listar profesionales enviados para revision (con documentos y validaciones)' })
  @ApiResponse({ status: 200, description: 'Lista de profesionales en estado pending_review' })
  async getPendingReview() {
    return this.adminService.getPendingReview();
  }

  @Post('professionals/:id/approve')
  @ApiOperation({ summary: 'Aprobar un profesional (legacy - sin registro de validacion)' })
  @ApiResponse({ status: 201, description: 'Profesional aprobado' })
  @ApiResponse({ status: 404, description: 'Profesional no encontrado' })
  async approveProfessional(@Param('id') id: string) {
    return this.adminService.approveProfessional(id);
  }

  @Post('professionals/:id/validate')
  @ApiOperation({ summary: 'Validar perfil profesional (aprobar o rechazar con notas y documentos revisados)' })
  @ApiResponse({ status: 201, description: 'Validacion registrada, estado del perfil actualizado' })
  @ApiResponse({ status: 404, description: 'Profesional no encontrado' })
  async validateProfile(
    @CurrentUser() user: CurrentUserType,
    @Param('id') id: string,
    @Body(new ValidationPipe({ whitelist: true, transform: true })) dto: ValidateProfileDto,
  ) {
    return this.adminService.validateProfile(user.userId, id, dto);
  }

  @Get('professionals/:id/documents')
  @ApiOperation({ summary: 'Ver documentos subidos por un profesional' })
  @ApiParam({ name: 'id', description: 'ID del perfil profesional' })
  @ApiResponse({ status: 200, description: 'Lista de documentos del profesional' })
  @ApiResponse({ status: 404, description: 'Profesional no encontrado' })
  async getProfileDocuments(@Param('id') id: string) {
    return this.adminService.getProfileDocuments(id);
  }

  @Get('professionals/:id')
  @ApiOperation({ summary: 'Ver perfil completo de un profesional (sin filtro de estado ni actividad)' })
  @ApiParam({ name: 'id', description: 'ID del perfil profesional' })
  @ApiResponse({ status: 200, description: 'Perfil completo del profesional con todas sus relaciones' })
  @ApiResponse({ status: 404, description: 'Profesional no encontrado' })
  async getOneProfessional(@Param('id') id: string) {
    return this.adminService.findOneProfessional(id);
  }

  @Get('professionals/:id/validation-history')
  @ApiOperation({ summary: 'Historial de validaciones de un profesional' })
  @ApiResponse({ status: 200, description: 'Lista de validaciones con reviewer y notas' })
  @ApiResponse({ status: 404, description: 'Profesional no encontrado' })
  async getValidationHistory(@Param('id') id: string) {
    return this.adminService.getValidationHistory(id);
  }

  @Post('documents/:id/verify')
  @ApiOperation({ summary: 'Verificar un documento (aprobar o rechazar)' })
  @ApiResponse({ status: 201, description: 'Documento verificado exitosamente' })
  @ApiResponse({ status: 404, description: 'Documento no encontrado' })
  async verifyDocument(
    @CurrentUser() user: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ValidationPipe({ whitelist: true, transform: true })) dto: VerifyDocumentDto,
  ) {
    return this.adminService.verifyDocument(user.userId, id, dto);
  }

  @Patch('professionals/:id/trial')
  @ApiOperation({ summary: 'Setear o limpiar la fecha de fin de prueba de un profesional' })
  @ApiParam({ name: 'id', description: 'ID del perfil profesional' })
  @ApiResponse({ status: 200, description: 'Perfil profesional actualizado' })
  @ApiResponse({ status: 404, description: 'Profesional no encontrado' })
  async setTrialDate(
    @Param('id') id: string,
    @Body(new ValidationPipe({ whitelist: true, transform: true })) dto: SetTrialDateDto,
  ) {
    const trialEndDate = dto.trialEndDate ? new Date(dto.trialEndDate) : null;

    return this.adminService.setTrialDate(id, trialEndDate);
  }

  @Post('jobs')
  @ApiOperation({ summary: 'Crear una oferta de trabajo' })
  @ApiResponse({ status: 201, description: 'Trabajo creado' })
  async createJob(@Body(new ValidationPipe()) dto: CreateJobDto) {
    return this.adminService.createJob(dto);
  }

  @Get('subscription-payments')
  @ApiOperation({ summary: 'Listar todos los pagos de suscripción (paginado, con filtros)' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Página actual (default: 1)' })
  @ApiQuery({ name: 'sizePage', required: false, type: Number, description: 'Resultados por página (default: 10)' })
  @ApiQuery({ name: 'status', required: false, enum: SubscriptionPaymentStatus, description: 'Filtrar por estado del pago' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Buscar por email o external ID' })
  @ApiResponse({ status: 200, description: 'Lista paginada de pagos de suscripción' })
  async getSubscriptionPayments(
    @Query('page') page = 1,
    @Query('sizePage') sizePage = 10,
    @Query('status') status?: SubscriptionPaymentStatus,
    @Query('search') search?: string,
  ) {
    return this.adminService.getSubscriptionPayments({
      page: Number(page),
      sizePage: Number(sizePage),
      status,
      search,
    });
  }

  @Get('subscription-plans')
  @ApiOperation({ summary: 'Listar planes de suscripción (paginado, con filtros)' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Página actual (default: 1)' })
  @ApiQuery({ name: 'sizePage', required: false, type: Number, description: 'Resultados por página (default: 10)' })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean, description: 'Filtrar por activo/inactivo' })
  @ApiQuery({ name: 'frequencyType', required: false, enum: FrequencyType, description: 'Filtrar por tipo de frecuencia' })
  @ApiQuery({ name: 'hasTrial', required: false, type: Boolean, description: 'Filtrar por planes con/sin período de prueba' })
  @ApiResponse({ status: 200, description: 'Lista paginada de planes de suscripción' })
  async getSubscriptionPlans(
    @Query('page') page = 1,
    @Query('sizePage') sizePage = 10,
    @Query('isActive') isActive?: string,
    @Query('frequencyType') frequencyType?: FrequencyType,
    @Query('hasTrial') hasTrial?: string,
  ) {
    return this.adminService.getSubscriptionPlans({
      page: Number(page),
      sizePage: Number(sizePage),
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      frequencyType,
      hasTrial: hasTrial !== undefined ? hasTrial === 'true' : undefined,
    });
  }

  @Get('professionals/:id/payments')
  @ApiOperation({ summary: 'Historial de pagos de suscripción de un profesional' })
  @ApiParam({ name: 'id', description: 'ID del perfil profesional' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Página actual (default: 1)' })
  @ApiQuery({ name: 'sizePage', required: false, type: Number, description: 'Resultados por página (default: 10)' })
  @ApiResponse({ status: 200, description: 'Lista paginada de pagos del profesional' })
  @ApiResponse({ status: 404, description: 'Profesional no encontrado' })
  async getProfessionalPayments(
    @Param('id') id: string,
    @Query('page') page = 1,
    @Query('sizePage') sizePage = 10,
  ) {
    return this.adminService.getProfessionalSubscriptionPayments(id, Number(page), Number(sizePage));
  }

  @Get('payments')
  @ApiOperation({ summary: 'Listar todos los pagos (one-time)' })
  @ApiResponse({ status: 200, description: 'Lista de pagos' })
  async getPayments() {
    return this.adminService.getPayments();
  }
}
