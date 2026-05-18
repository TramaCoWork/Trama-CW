import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, ProfileStatus, SubscriptionPaymentStatus, FrequencyType } from '@prisma/client';
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
    private readonly configService: ConfigService,
  ) {}

  // ─── Profesionales pendientes ────────────────────────────────────────────

  async findAllProfessionals(filters: {
    page: number;
    sizePage: number;
    profileStatus?: ProfileStatus;
    isActive?: boolean;
    search?: string;
    rubroId?: number;
    countryId?: number;
    provinceId?: number;
  }) {
    const { page, sizePage, profileStatus, isActive, search, rubroId, countryId, provinceId } = filters;

    const where: Prisma.ProfessionalProfileWhereInput = {};

    if (profileStatus) where.profileStatus = profileStatus;
    if (isActive !== undefined) where.isActive = isActive;
    if (rubroId) where.rubroId = rubroId;
    if (countryId) where.countryId = countryId;
    if (provinceId) where.provinceId = provinceId;

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.professionalProfile.findMany({
        where,
        include: {
          user: { select: { id: true, email: true } },
          rubro: true,
          country: true,
          province: true,
          professionCategories: true,
        },
        skip: (page - 1) * sizePage,
        take: sizePage,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.professionalProfile.count({ where }),
    ]);

    return { data, total, page, sizePage };
  }

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
    const trialDays = this.configService.get<number>('TRIAL_DAYS', 0);
    await this.prisma.professionalProfile.update({
      where: { id: profile.id },
      data: {
        profileStatus: isApproved ? 'active' : 'rejected',
        isActive: isApproved,
        ...(isApproved && trialDays > 0 && {
          trialEndDate: new Date(Date.now() + trialDays * 86400000),
        }),
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

  async setTrialDate(professionalProfileId: string, trialEndDate: Date | null) {
    await this.findProfileOrThrow(professionalProfileId);

    return this.prisma.professionalProfile.update({
      where: { id: professionalProfileId },
      data: { trialEndDate },
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

  // ─── Subscription Payments ────────────────────────────────────────────────

  async getSubscriptionPayments(filters: {
    page: number;
    sizePage: number;
    status?: SubscriptionPaymentStatus;
    search?: string;
  }) {
    const { page, sizePage, status, search } = filters;

    const where: Prisma.SubscriptionPaymentWhereInput = {};

    if (status) where.status = status;

    if (search) {
      where.subscription = {
        OR: [
          { user: { email: { contains: search, mode: 'insensitive' } } },
          { externalId: { contains: search, mode: 'insensitive' } },
        ],
      };
    }

    const [data, total] = await Promise.all([
      this.prisma.subscriptionPayment.findMany({
        where,
        include: {
          subscription: {
            select: {
              externalId: true,
              user: { select: { id: true, email: true } },
              plan: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * sizePage,
        take: sizePage,
      }),
      this.prisma.subscriptionPayment.count({ where }),
    ]);

    return { data, total, page, sizePage };
  }

  async getSubscriptionPlans(filters: {
    page: number;
    sizePage: number;
    isActive?: boolean;
    frequencyType?: FrequencyType;
    hasTrial?: boolean;
  }) {
    const { page, sizePage, isActive, frequencyType, hasTrial } = filters;

    const where: Prisma.SubscriptionPlanWhereInput = {};

    if (isActive !== undefined) where.isActive = isActive;
    if (frequencyType) where.frequencyType = frequencyType;

    if (hasTrial !== undefined) {
      if (hasTrial) {
        where.trialDays = { gt: 0 };
      } else {
        where.OR = [{ trialDays: { equals: 0 } }];
      }
    }

    const [data, total] = await Promise.all([
      this.prisma.subscriptionPlan.findMany({
        where,
        skip: (page - 1) * sizePage,
        take: sizePage,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.subscriptionPlan.count({ where }),
    ]);

    return { data, total, page, sizePage };
  }

  async getProfessionalSubscriptionPayments(profileId: string, page = 1, sizePage = 10) {
    const profile = await this.findProfileOrThrow(profileId);

    const where: Prisma.SubscriptionPaymentWhereInput = {
      subscription: { userId: profile.userId },
    };

    const [data, total] = await Promise.all([
      this.prisma.subscriptionPayment.findMany({
        where,
        include: {
          subscription: {
            select: { externalId: true, plan: { select: { id: true, name: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * sizePage,
        take: sizePage,
      }),
      this.prisma.subscriptionPayment.count({ where }),
    ]);

    return { data, total, page, sizePage };
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  async findOneProfessional(id: string) {
    const profile = await this.prisma.professionalProfile.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, email: true, role: true, emailVerified: true, createdAt: true } },
        rubro: true,
        country: true,
        province: true,
        professionCategories: true,
        educations: { include: { documents: true } },
        certifications: { include: { documents: true } },
        documents: true,
        validations: { orderBy: { createdAt: 'desc' } },
      },
    });

    if (!profile) {
      throw new NotFoundException('Professional profile not found');
    }

    return profile;
  }

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
