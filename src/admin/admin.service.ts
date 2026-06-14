import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Prisma,
  ProfileStatus,
  SubscriptionPaymentStatus,
  FrequencyType,
  SubscriptionStatus,
  UserRole,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { CreateJobDto } from './dto/create-job.dto';
import { ValidateProfileDto } from './dto/validate-profile.dto';
import { VerifyDocumentDto } from './dto/verify-document.dto';
import { AdminRegisterProfessionalDto } from './dto/admin-register-professional.dto';
import { AdminUpdateProfessionalDto } from './dto/admin-update-professional.dto';
import { withoutDeleted } from '../common/filters/soft-delete.filter';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
  ) {}

  async registerProfessional(dto: AdminRegisterProfessionalDto) {
    const existing = await this.prisma.user.findUnique({
      where: withoutDeleted({ email: dto.email }),
    });
    if (existing) throw new ConflictException('Email already in use');

    if (dto.rubroId) {
      const rubro = await this.prisma.professionCategory.findFirst({
        where: { id: dto.rubroId, level: 1, isActive: true },
      });
      if (!rubro) throw new BadRequestException('Rubro inválido o inactivo');
    }

    if (dto.professionCategoryIds && dto.professionCategoryIds.length > 0) {
      if (!dto.rubroId) {
        throw new BadRequestException(
          'Debe indicar rubroId si envía professionCategoryIds',
        );
      }

      const validCategories = await this.prisma.professionCategory.findMany({
        where: {
          id: { in: dto.professionCategoryIds },
          level: 3,
          isActive: true,
          parent: { parentId: dto.rubroId },
        },
      });

      if (validCategories.length !== dto.professionCategoryIds.length) {
        throw new BadRequestException(
          'Algunas profesiones seleccionadas no pertenecen al rubro indicado',
        );
      }
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.$transaction(async (tx) => {
      return tx.user.create({
        data: {
          email: dto.email,
          passwordHash,
          role: UserRole.professional,
          emailVerified: dto.emailVerified ?? true,
          profile: {
            create: {
              name: dto.name,
              city: dto.city,
              address: dto.address,
              photo: dto.photo,
              dni: dto.document,
              rubroId: dto.rubroId ?? null,
              countryId: dto.countryId ?? null,
              provinceId: dto.provinceId ?? null,
              whatsapp: dto.whatsapp,
              profileStatus: dto.profileStatus ?? ProfileStatus.active,
              isActive: dto.isActive ?? dto.is_active ?? false,
              trialEndDate: dto.trialEndDate
                ? new Date(dto.trialEndDate)
                : null,
              services: [],
              ...(dto.professionCategoryIds &&
              dto.professionCategoryIds.length > 0
                ? {
                    professionCategories: {
                      connect: dto.professionCategoryIds.map((id) => ({ id })),
                    },
                  }
                : {}),
            },
          },
        },
        include: {
          profile: {
            include: { professionCategories: true, rubro: true },
          },
        },
      });
    });

    return {
      message: 'Profesional registrado exitosamente',
      user,
    };
  }

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
    const {
      page,
      sizePage,
      profileStatus,
      isActive,
      search,
      rubroId,
      countryId,
      provinceId,
    } = filters;

    const where: Prisma.ProfessionalProfileWhereInput = {};
    where.deletedAt = null;

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
        deletedAt: null,
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
      where: { profileStatus: 'pending_review', deletedAt: null },
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
      where: withoutDeleted({ id }),
      data: {
        isActive: true,
        profileStatus: 'active',
      },
    });
  }

  // ─── Validacion con registro ─────────────────────────────────────────────

  async validateProfile(
    adminUserId: string,
    profileId: string,
    dto: ValidateProfileDto,
  ) {
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
      where: withoutDeleted({ id: profile.id }),
      data: {
        profileStatus: isApproved ? 'active' : 'rejected',
        isActive: isApproved,
        ...(isApproved &&
          trialDays > 0 && {
            trialEndDate: new Date(Date.now() + trialDays * 86400000),
          }),
      },
    });

    // Enviar email de notificacion
    const user = await this.prisma.user.findUnique({
      where: withoutDeleted({ id: profile.userId }),
      select: { email: true },
    });

    if (user?.email) {
      const name = profile.name || 'Profesional';
      if (isApproved) {
        await this.mailService.sendProfileApproved(user.email, name);
      } else {
        await this.mailService.sendProfileRejected(
          user.email,
          name,
          dto.reviewNotes,
        );
      }
    }

    return validation;
  }

  async getProfileDocuments(profileId: string) {
    await this.findProfileOrThrow(profileId);

    const documents = await this.prisma.document.findMany({
      where: { professionalId: profileId },
      orderBy: { uploadedAt: 'desc' },
      include: {
        education: true,
        certification: true,
        profession: true,
      },
    });

    return documents.map(({ education, certification, profession, ...document }) => ({
      ...document,
      professionName: profession?.name ?? null,
      educationTitle: education?.title ?? null,
      educationInstitution: education?.institution ?? null,
      educationYear: education?.year ?? null,
      certificationName: certification?.name ?? null,
    }));
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
      where: withoutDeleted({ id: professionalProfileId }),
      data: { trialEndDate },
    });
  }

  async updateProfessional(id: string, dto: AdminUpdateProfessionalDto) {
    const profile = await this.findProfileOrThrow(id);
    const data: Prisma.ProfessionalProfileUpdateInput = {};

    if (dto.name !== undefined) data.name = dto.name;
    if (dto.city !== undefined) data.city = dto.city;
    if (dto.address !== undefined) data.address = dto.address;
    if (dto.photo !== undefined) data.photo = dto.photo;
    if (dto.document !== undefined) data.dni = dto.document;
    if (dto.whatsapp !== undefined) data.whatsapp = dto.whatsapp;
    if (dto.pricePerHour !== undefined) data.pricePerHour = dto.pricePerHour;
    if (dto.isActive !== undefined || dto.is_active !== undefined) {
      data.isActive = dto.isActive ?? dto.is_active;
    }
    if (dto.rubroId !== undefined) data.rubro = { connect: { id: dto.rubroId } };
    if (dto.countryId !== undefined) data.country = { connect: { id: dto.countryId } };
    if (dto.provinceId !== undefined) data.province = { connect: { id: dto.provinceId } };
    if (dto.profileStatus !== undefined) data.profileStatus = dto.profileStatus;
    if (dto.trialEndDate !== undefined) data.trialEndDate = new Date(dto.trialEndDate);
    if (dto.professionCategoryIds !== undefined) {
      data.professionCategories = {
        set: dto.professionCategoryIds.map((categoryId) => ({ id: categoryId })),
      };
    }

    if (dto.emailVerified !== undefined) {
      await this.prisma.user.update({
        where: withoutDeleted({ id: profile.userId }),
        data: { emailVerified: dto.emailVerified },
      });
    }

    return this.prisma.professionalProfile.update({
      where: withoutDeleted({ id }),
      data,
      include: {
        user: { select: { id: true, email: true, emailVerified: true } },
        rubro: true,
        country: true,
        province: true,
        professionCategories: true,
      },
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

  async listSoftDeletedUsers(skip = 0, take = 20) {
    const where = { deletedAt: { not: null } };
    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          deletedAt: true,
          role: true,
        },
        skip,
        take,
        orderBy: { deletedAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { data, total, skip, take };
  }

  async restoreSoftDeletedUser(userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: { not: null } },
      include: { profile: true },
    });

    if (!user) {
      throw new NotFoundException('Soft-deleted user not found');
    }

    const [restoredUser] = await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: { deletedAt: null },
      }),
      this.prisma.professionalProfile.updateMany({
        where: { userId, deletedAt: { not: null } },
        data: { deletedAt: null },
      }),
    ]);

    return restoredUser;
  }

  // ─── Verificacion de documentos ───────────────────────────────────────────

  async verifyDocument(
    adminUserId: string,
    documentId: string,
    dto: VerifyDocumentDto,
  ) {
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

  async getSubscriptions(filters: {
    page: number;
    sizePage: number;
    status?: SubscriptionStatus;
    search?: string;
  }) {
    const { page, sizePage, status, search } = filters;

    const where: Prisma.SubscriptionWhereInput = {};

    if (status) where.status = status;

    if (search) {
      where.user = {
        email: { contains: search, mode: 'insensitive' },
      };
    }

    const [data, total] = await Promise.all([
      this.prisma.subscription.findMany({
        where,
        include: {
          user: { select: { id: true, email: true } },
          plan: {
            select: { id: true, name: true, amount: true, frequencyType: true },
          },
          _count: { select: { payments: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * sizePage,
        take: sizePage,
      }),
      this.prisma.subscription.count({ where }),
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

    const where: Prisma.SubscriptionPlanWhereInput = { deletedAt: null };

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

  async getProfessionalSubscriptionPayments(
    profileId: string,
    page = 1,
    sizePage = 10,
  ) {
    const profile = await this.findProfileOrThrow(profileId);

    const where: Prisma.SubscriptionPaymentWhereInput = {
      subscription: { userId: profile.userId },
    };

    const [data, total] = await Promise.all([
      this.prisma.subscriptionPayment.findMany({
        where,
        include: {
          subscription: {
            select: {
              externalId: true,
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

  // ─── Helpers ─────────────────────────────────────────────────────────────

  async findOneProfessional(id: string) {
    const profile = await this.prisma.professionalProfile.findUnique({
      where: withoutDeleted({ id }),
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            emailVerified: true,
            createdAt: true,
          },
        },
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
      where: withoutDeleted({ id }),
    });

    if (!profile) {
      throw new NotFoundException('Professional profile not found');
    }

    return profile;
  }
}
