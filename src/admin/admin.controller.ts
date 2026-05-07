import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  ValidationPipe,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { CreateJobDto } from './dto/create-job.dto';
import { ValidateProfileDto } from './dto/validate-profile.dto';
import { VerifyDocumentDto } from './dto/verify-document.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserType } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

@ApiTags('Admin')
@ApiBearerAuth()
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.admin)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

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
  @ApiResponse({ status: 200, description: 'Lista de documentos del profesional' })
  @ApiResponse({ status: 404, description: 'Profesional no encontrado' })
  async getProfileDocuments(@Param('id') id: string) {
    return this.adminService.getProfileDocuments(id);
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

  @Post('jobs')
  @ApiOperation({ summary: 'Crear una oferta de trabajo' })
  @ApiResponse({ status: 201, description: 'Trabajo creado' })
  async createJob(@Body(new ValidationPipe()) dto: CreateJobDto) {
    return this.adminService.createJob(dto);
  }

  @Get('payments')
  @ApiOperation({ summary: 'Listar todos los pagos' })
  @ApiResponse({ status: 200, description: 'Lista de pagos' })
  async getPayments() {
    return this.adminService.getPayments();
  }
}
