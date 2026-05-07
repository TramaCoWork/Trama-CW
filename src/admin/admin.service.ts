import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { CreateJobDto } from './dto/create-job.dto';
import { ValidateProfileDto } from './dto/validate-profile.dto';
import { VerifyDocumentDto } from './dto/verify-document.dto';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  // ─── Profesionales pendientes ────────────────────────────────────────────

  async getPendingProfessionals() {
    return this.prisma.professionalProfile.findMany({
      where: {
        OR: [
          { isActive: false },
          { profileStatus: { in: ['incomplete', 'onboarding'] } },
        ],
      },
      include: {
        user: { select: { id: true, email: true } },
      },
    });
  }

  async getPendingReview() {
    return this.prisma.professionalProfile.findMany({
      where: { profileStatus: 'pending_review' },
      include: {
        user: { select: { id: true, email: true } },
        documents: true,
        educations: { include: { documents: true } },
        certifications: { include: { documents: true } },
        validations: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { submittedAt: 'asc' },
    });
  }

  // ─── Aprobacion simple (legacy) ──────────────────────────────────────────

  async approveProfessional(id: string) {
    const profile = await this.findProfileOrThrow(id);

    return this.prisma.professionalProfile.update({
      where: { id },
      data: {
        isActive: true,
        profileStatus: 'active',
      },
    });
  }

  // ─── Validacion con registro ─────────────────────────────────────────────

  async validateProfile(adminUserId: string, profileId: string, dto: ValidateProfileDto) {
    const profile = await this.findProfileOrThrow(profileId);

    // Crear registro de validacion
    const validation = await this.prisma.profileValidation.create({
      data: {
        professionalId: profile.id,
        status: dto.status,
        validationType: 'manual',
        reviewedBy: adminUserId,
        reviewNotes: dto.reviewNotes,
        documentsReviewed: dto.documentsReviewed ?? [],
      },
    });

    // Actualizar estado del perfil
    const isApproved = dto.status === 'manual_approved';
    await this.prisma.professionalProfile.update({
      where: { id: profile.id },
      data: {
        profileStatus: isApproved ? 'active' : 'rejected',
        isActive: isApproved,
      },
    });

    // Enviar email de notificacion
    const user = await this.prisma.user.findUnique({
      where: { id: profile.userId },
      select: { email: true },
    });

    if (user?.email) {
      const name = profile.name || 'Profesional';
      if (isApproved) {
        await this.mailService.sendProfileApproved(user.email, name);
      } else {
        await this.mailService.sendProfileRejected(user.email, name, dto.reviewNotes);
      }
    }

    return validation;
  }

  async getProfileDocuments(profileId: string) {
    await this.findProfileOrThrow(profileId);

    return this.prisma.document.findMany({
      where: { professionalId: profileId },
      orderBy: { uploadedAt: 'desc' },
    });
  }

  async getValidationHistory(profileId: string) {
    await this.findProfileOrThrow(profileId);

    return this.prisma.profileValidation.findMany({
      where: { professionalId: profileId },
      include: {
        reviewer: { select: { id: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ─── Jobs ────────────────────────────────────────────────────────────────

  async createJob(dto: CreateJobDto) {
    return this.prisma.job.create({
      data: {
        title: dto.title,
        description: dto.description,
        createdByAdmin: true,
        isActive: true,
      },
    });
  }

  // ─── Payments ────────────────────────────────────────────────────────────

  async getPayments() {
    return this.prisma.payment.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, email: true } },
      },
    });
  }

  // ─── Verificacion de documentos ───────────────────────────────────────────

  async verifyDocument(adminUserId: string, documentId: string, dto: VerifyDocumentDto) {
    const document = await this.prisma.document.findUnique({
      where: { id: documentId },
    });

    if (!document) {
      throw new NotFoundException('Documento no encontrado');
    }

    return this.prisma.document.update({
      where: { id: documentId },
      data: {
        verificationStatus: dto.status,
        verifiedBy: adminUserId,
        verifiedAt: new Date(),
        verificationNotes: dto.verificationNotes ?? null,
        verificationType: 'manual',
      },
    });
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  private async findProfileOrThrow(id: string) {
    const profile = await this.prisma.professionalProfile.findUnique({
      where: { id },
    });

    if (!profile) {
      throw new NotFoundException('Professional profile not found');
    }

    return profile;
  }
}
