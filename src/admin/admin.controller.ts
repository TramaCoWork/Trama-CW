import {
  ForbiddenException,
  Controller,
  Delete,
  Get,
  HttpCode,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  ValidationPipe,
  ParseUUIDPipe,
  UsePipes,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { CreateJobDto } from './dto/create-job.dto';
import { ValidateProfileDto } from './dto/validate-profile.dto';
import { VerifyDocumentDto } from './dto/verify-document.dto';
import { SetTrialDateDto } from './dto/set-trial-date.dto';
import { AdminRegisterProfessionalDto } from './dto/admin-register-professional.dto';
import { AdminUpdateProfessionalDto } from './dto/admin-update-professional.dto';
import { AdminChangeProfessionalPasswordDto } from './dto/admin-change-professional-password.dto';
import { AdminCreateUserDto } from './dto/admin-create-user.dto';
import { AdminUpdateUserDto } from './dto/admin-update-user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserType } from '../auth/decorators/current-user.decorator';
import {
  ProfileStatus,
  SubscriptionPaymentStatus,
  FrequencyType,
  SubscriptionStatus,
} from '@prisma/client';
import { UpdateSubscriptionAmountDto } from './dto/update-subscription-amount.dto';
import { UpdateReferralCodeDto } from '../auth/dto/update-referral-code.dto';

@ApiTags('Admin')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  private assertCanMutateUser(user: CurrentUserType, targetUserId: string) {
    if (user.userId === targetUserId) {
      throw new ForbiddenException('You cannot modify your own account');
    }
  }

  @Get('professionals')
  @ApiOperation({
    summary:
      'Listar todos los profesionales (incluye inactivos y todos los estados)',
  })
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
  @ApiQuery({
    name: 'profileStatus',
    required: false,
    enum: ProfileStatus,
    description: 'Filtrar por estado del perfil',
  })
  @ApiQuery({
    name: 'isActive',
    required: false,
    type: Boolean,
    description: 'Filtrar por activo/inactivo',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Buscar por nombre o email',
  })
  @ApiQuery({
    name: 'rubroId',
    required: false,
    type: Number,
    description: 'Filtrar por rubro',
  })
  @ApiQuery({
    name: 'countryId',
    required: false,
    type: Number,
    description: 'Filtrar por pais',
  })
  @ApiQuery({
    name: 'provinceId',
    required: false,
    type: Number,
    description: 'Filtrar por provincia',
  })
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
  @ApiOperation({
    summary: 'Listar profesionales pendientes (incompletos / onboarding)',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de profesionales pendientes',
  })
  async getPendingProfessionals() {
    return this.adminService.getPendingProfessionals();
  }

  @Get('professionals/pending-review')
  @ApiOperation({
    summary:
      'Listar profesionales enviados para revision (con documentos y validaciones)',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de profesionales en estado pending_review',
  })
  async getPendingReview() {
    return this.adminService.getPendingReview();
  }

  @Post('professionals/register')
  @ApiOperation({ summary: 'Registrar un profesional manualmente (admin)' })
  @ApiResponse({ status: 201, description: 'Profesional creado exitosamente' })
  @ApiResponse({ status: 409, description: 'Email ya en uso' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  async registerProfessional(
    @Body(new ValidationPipe({ whitelist: true, transform: true }))
    dto: AdminRegisterProfessionalDto,
  ) {
    return this.adminService.registerProfessional(dto);
  }

  @Post('professionals/:id/approve')
  @ApiOperation({
    summary: 'Aprobar un profesional (legacy - sin registro de validacion)',
  })
  @ApiResponse({ status: 201, description: 'Profesional aprobado' })
  @ApiResponse({ status: 404, description: 'Profesional no encontrado' })
  async approveProfessional(@Param('id') id: string) {
    return this.adminService.approveProfessional(id);
  }

  @Post('professionals/:id/resend-verification')
  @HttpCode(200)
  @ApiOperation({
    summary: 'Reenviar el email de verificación de cuenta al profesional',
  })
  @ApiParam({ name: 'id', description: 'ID del perfil profesional' })
  @ApiResponse({ status: 200, description: 'Email de verificación reenviado' })
  @ApiResponse({ status: 400, description: 'El email ya fue verificado' })
  @ApiResponse({ status: 404, description: 'Profesional no encontrado' })
  async resendProfessionalVerification(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.resendProfessionalVerification(id);
  }

  @Post('professionals/:id/validate')
  @ApiOperation({
    summary:
      'Validar perfil profesional (aprobar o rechazar con notas y documentos revisados)',
  })
  @ApiResponse({
    status: 201,
    description: 'Validacion registrada, estado del perfil actualizado',
  })
  @ApiResponse({ status: 404, description: 'Profesional no encontrado' })
  async validateProfile(
    @CurrentUser() user: CurrentUserType,
    @Param('id') id: string,
    @Body(new ValidationPipe({ whitelist: true, transform: true }))
    dto: ValidateProfileDto,
  ) {
    return this.adminService.validateProfile(user.userId, id, dto);
  }

  @Get('professionals/:id/documents')
  @ApiOperation({ summary: 'Ver documentos subidos por un profesional' })
  @ApiParam({ name: 'id', description: 'ID del perfil profesional' })
  @ApiResponse({
    status: 200,
    description: 'Lista de documentos del profesional',
  })
  @ApiResponse({ status: 404, description: 'Profesional no encontrado' })
  async getProfileDocuments(@Param('id') id: string) {
    return this.adminService.getProfileDocuments(id);
  }

  @Get('professionals/:id')
  @ApiOperation({
    summary:
      'Ver perfil completo de un profesional (sin filtro de estado ni actividad)',
  })
  @ApiParam({ name: 'id', description: 'ID del perfil profesional' })
  @ApiResponse({
    status: 200,
    description: 'Perfil completo del profesional con todas sus relaciones',
  })
  @ApiResponse({ status: 404, description: 'Profesional no encontrado' })
  async getOneProfessional(@Param('id') id: string) {
    return this.adminService.findOneProfessional(id);
  }

  @Get('professionals/:id/validation-history')
  @ApiOperation({ summary: 'Historial de validaciones de un profesional' })
  @ApiResponse({
    status: 200,
    description: 'Lista de validaciones con reviewer y notas',
  })
  @ApiResponse({ status: 404, description: 'Profesional no encontrado' })
  async getValidationHistory(@Param('id') id: string) {
    return this.adminService.getValidationHistory(id);
  }

  @Post('documents/:id/verify')
  @ApiOperation({ summary: 'Verificar un documento (aprobar o rechazar)' })
  @ApiResponse({
    status: 201,
    description: 'Documento verificado exitosamente',
  })
  @ApiResponse({ status: 404, description: 'Documento no encontrado' })
  async verifyDocument(
    @CurrentUser() user: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ValidationPipe({ whitelist: true, transform: true }))
    dto: VerifyDocumentDto,
  ) {
    return this.adminService.verifyDocument(user.userId, id, dto);
  }

  @Patch('professionals/:id/trial')
  @ApiOperation({
    summary: 'Setear o limpiar la fecha de fin de prueba de un profesional',
  })
  @ApiParam({ name: 'id', description: 'ID del perfil profesional' })
  @ApiResponse({ status: 200, description: 'Perfil profesional actualizado' })
  @ApiResponse({ status: 404, description: 'Profesional no encontrado' })
  async setTrialDate(
    @Param('id') id: string,
    @Body(new ValidationPipe({ whitelist: true, transform: true }))
    dto: SetTrialDateDto,
  ) {
    const trialEndDate = dto.trialEndDate ? new Date(dto.trialEndDate) : null;

    return this.adminService.setTrialDate(id, trialEndDate);
  }

  @Patch('professionals/:id')
  @ApiOperation({ summary: 'Actualizar datos de un profesional (admin)' })
  @ApiParam({ name: 'id', description: 'ID del perfil profesional' })
  @ApiResponse({ status: 200, description: 'Perfil profesional actualizado' })
  @ApiResponse({ status: 404, description: 'Profesional no encontrado' })
  async updateProfessional(
    @Param('id') id: string,
    @Body(new ValidationPipe({ whitelist: true, transform: true }))
    dto: AdminUpdateProfessionalDto,
  ) {
    return this.adminService.updateProfessional(id, dto);
  }

  @Patch('professionals/:id/password')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Actualizar contraseña de un profesional (admin)' })
  @ApiParam({ name: 'id', description: 'ID del perfil profesional' })
  @ApiResponse({ status: 200, description: 'Contraseña actualizada' })
  @ApiResponse({ status: 404, description: 'Profesional no encontrado' })
  async changeProfessionalPassword(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ValidationPipe({ whitelist: true, transform: true }))
    dto: AdminChangeProfessionalPasswordDto,
  ) {
    return this.adminService.changeProfessionalPassword(id, dto.password);
  }

  @Post('jobs')
  @ApiOperation({ summary: 'Crear una oferta de trabajo' })
  @ApiResponse({ status: 201, description: 'Trabajo creado' })
  async createJob(@Body(new ValidationPipe()) dto: CreateJobDto) {
    return this.adminService.createJob(dto);
  }

  @Get('jobs')
  @ApiOperation({ summary: 'Listar ejecuciones de jobs (paginado, con filtro)' })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Página actual (default: 1)',
  })
  @ApiQuery({
    name: 'sizePage',
    required: false,
    type: Number,
    description: 'Resultados por página (default: 20)',
  })
  @ApiQuery({
    name: 'jobName',
    required: false,
    type: String,
    description: 'Filtrar por nombre del job',
  })
  @ApiResponse({ status: 200, description: 'Lista paginada de ejecuciones de jobs' })
  async getJobExecutions(
    @Query('page') page = 1,
    @Query('sizePage') sizePage = 20,
    @Query('jobName') jobName?: string,
  ) {
    return this.adminService.getJobExecutions({
      page: Number(page),
      sizePage: Number(sizePage),
      jobName,
    });
  }

  @Post('jobs/:jobName/run')
  @HttpCode(200)
  @ApiOperation({ summary: 'Disparar ejecución manual de un cron job' })
  @ApiParam({ name: 'jobName', description: 'Nombre del job a ejecutar' })
  @ApiResponse({
    status: 200,
    description: 'Job iniciado en background',
  })
  @ApiResponse({ status: 404, description: 'Job no encontrado' })
  async triggerJob(@Param('jobName') jobName: string) {
    return this.adminService.triggerJob(jobName);
  }

  @Get('subscription-payments')
  @ApiOperation({
    summary: 'Listar todos los pagos de suscripción (paginado, con filtros)',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Página actual (default: 1)',
  })
  @ApiQuery({
    name: 'sizePage',
    required: false,
    type: Number,
    description: 'Resultados por página (default: 10)',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: SubscriptionPaymentStatus,
    description: 'Filtrar por estado del pago',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Buscar por email o external ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista paginada de pagos de suscripción',
  })
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

  @Get('subscriptions')
  @ApiOperation({ summary: 'Listar suscripciones (paginado, con filtros)' })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Página actual (default: 1)',
  })
  @ApiQuery({
    name: 'sizePage',
    required: false,
    type: Number,
    description: 'Resultados por página (default: 10)',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: SubscriptionStatus,
    description: 'Filtrar por estado de suscripción',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Buscar por email de usuario',
  })
  @ApiResponse({ status: 200, description: 'Lista paginada de suscripciones' })
  async getSubscriptions(
    @Query('page') page = 1,
    @Query('sizePage') sizePage = 10,
    @Query('status') status?: SubscriptionStatus,
    @Query('search') search?: string,
  ) {
    return this.adminService.getSubscriptions({
      page: Number(page),
      sizePage: Number(sizePage),
      status,
      search,
    });
  }

  @Get('subscription-plans')
  @ApiOperation({
    summary: 'Listar planes de suscripción (paginado, con filtros)',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Página actual (default: 1)',
  })
  @ApiQuery({
    name: 'sizePage',
    required: false,
    type: Number,
    description: 'Resultados por página (default: 10)',
  })
  @ApiQuery({
    name: 'isActive',
    required: false,
    type: Boolean,
    description: 'Filtrar por activo/inactivo',
  })
  @ApiQuery({
    name: 'frequencyType',
    required: false,
    enum: FrequencyType,
    description: 'Filtrar por tipo de frecuencia',
  })
  @ApiQuery({
    name: 'hasTrial',
    required: false,
    type: Boolean,
    description: 'Filtrar por planes con/sin período de prueba',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista paginada de planes de suscripción',
  })
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
  @ApiOperation({
    summary: 'Historial de pagos de suscripción de un profesional',
  })
  @ApiParam({ name: 'id', description: 'ID del perfil profesional' })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Página actual (default: 1)',
  })
  @ApiQuery({
    name: 'sizePage',
    required: false,
    type: Number,
    description: 'Resultados por página (default: 10)',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista paginada de pagos del profesional',
  })
  @ApiResponse({ status: 404, description: 'Profesional no encontrado' })
  async getProfessionalPayments(
    @Param('id') id: string,
    @Query('page') page = 1,
    @Query('sizePage') sizePage = 10,
  ) {
    return this.adminService.getProfessionalSubscriptionPayments(
      id,
      Number(page),
      Number(sizePage),
    );
  }

  @Get('payments')
  @ApiOperation({ summary: 'Listar todos los pagos (one-time)' })
  @ApiResponse({ status: 200, description: 'Lista de pagos' })
  async getPayments() {
    return this.adminService.getPayments();
  }

  @Post('users')
  @ApiOperation({ summary: 'Crear usuario (admin)' })
  @ApiResponse({ status: 201, description: 'Usuario creado exitosamente' })
  @ApiResponse({ status: 409, description: 'Email ya en uso' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  async createAdminUser(
    @Body(new ValidationPipe({ whitelist: true, transform: true }))
    dto: AdminCreateUserDto,
  ) {
    return this.adminService.createAdminUser(dto);
  }

  @Get('users')
  @ApiOperation({ summary: 'Listar usuarios activos' })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Filtrar usuarios por email',
  })
  @ApiResponse({ status: 200, description: 'Lista de usuarios activos' })
  async listAdminUsers(@Query('search') search?: string) {
    return this.adminService.listAdminUsers(search);
  }

  @Get('users/deleted')
  @ApiOperation({ summary: 'Listar usuarios soft-deleted' })
  @ApiQuery({
    name: 'skip',
    required: false,
    type: Number,
    description: 'Offset (default: 0)',
  })
  @ApiQuery({
    name: 'take',
    required: false,
    type: Number,
    description: 'Limit (default: 20)',
  })
  @ApiResponse({ status: 200, description: 'Lista de usuarios soft-deleted' })
  async listSoftDeletedUsers(
    @Query('skip') skip = 0,
    @Query('take') take = 20,
  ) {
    return this.adminService.listSoftDeletedUsers(Number(skip), Number(take));
  }

  @Post('users/:id/restore')
  @HttpCode(200)
  @ApiOperation({ summary: 'Restaurar usuario soft-deleted' })
  @ApiParam({ name: 'id', description: 'ID del usuario' })
  @ApiResponse({ status: 200, description: 'Usuario restaurado' })
  async restoreSoftDeletedUser(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.restoreSoftDeletedUser(id);
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'Obtener usuario activo por ID' })
  @ApiParam({ name: 'id', description: 'ID del usuario' })
  @ApiResponse({ status: 200, description: 'Usuario encontrado' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  async getAdminUserById(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.getAdminUserById(id);
  }

  @Patch('users/:id')
  @ApiOperation({ summary: 'Actualizar usuario (admin)' })
  @ApiParam({ name: 'id', description: 'ID del usuario' })
  @ApiResponse({ status: 200, description: 'Usuario actualizado' })
  @ApiResponse({
    status: 403,
    description: 'No puedes modificar tu propia cuenta',
  })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  async updateAdminUser(
    @CurrentUser() user: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ValidationPipe({ whitelist: true, transform: true }))
    dto: AdminUpdateUserDto,
  ) {
    this.assertCanMutateUser(user, id);
    return this.adminService.updateAdminUser(user.userId, id, dto);
  }

  @Delete('users/:id')
  @HttpCode(200)
  @ApiOperation({ summary: 'Eliminar usuario (soft-delete)' })
  @ApiParam({ name: 'id', description: 'ID del usuario' })
  @ApiResponse({ status: 200, description: 'Usuario eliminado' })
  @ApiResponse({
    status: 403,
    description: 'No puedes eliminar tu propia cuenta',
  })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  async softDeleteAdminUser(
    @CurrentUser() user: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    this.assertCanMutateUser(user, id);
    return this.adminService.softDeleteAdminUser(user.userId, id);
  }

  @Patch('subscriptions/:id/amount')
  @ApiOperation({
    summary:
      'Actualizar monto de cobro de una suscripción activa en Mercado Pago',
  })
  @ApiParam({ name: 'id', type: String, description: 'UUID de la suscripción' })
  @ApiBody({ type: UpdateSubscriptionAmountDto })
  @ApiResponse({
    status: 200,
    description: 'Monto actualizado en MP y descuento limpiado en DB',
  })
  @ApiResponse({ status: 404, description: 'Suscripción no encontrada' })
  @ApiResponse({
    status: 422,
    description: 'Suscripción sin PreApproval activo o estrategia incompatible',
  })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  updateSubscriptionAmount(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSubscriptionAmountDto,
  ) {
    return this.adminService.updateSubscriptionAmount(id, dto);
  }

  @Get('users/:id/referral-code')
  @ApiOperation({ summary: 'Obtener el código de referido de un usuario' })
  @ApiParam({ name: 'id', type: String, description: 'UUID del usuario' })
  @ApiResponse({ status: 200, description: 'Código de referido del usuario' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  getUserReferralCode(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.getUserReferralCode(id);
  }

  @Patch('users/:id/referral-code')
  @ApiOperation({
    summary: 'Setear o cambiar el código de referido de un usuario',
  })
  @ApiParam({ name: 'id', type: String, description: 'UUID del usuario' })
  @ApiBody({ type: UpdateReferralCodeDto })
  @ApiResponse({ status: 200, description: 'Código actualizado exitosamente' })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  @ApiResponse({
    status: 409,
    description: 'Código ya en uso por otro usuario',
  })
  @UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
  setUserReferralCode(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateReferralCodeDto,
  ) {
    return this.adminService.setUserReferralCode(id, dto);
  }
}
