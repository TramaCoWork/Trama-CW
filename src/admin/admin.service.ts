import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Prisma,
  ProfileStatus,
  SubscriptionPaymentStatus,
  FrequencyType,
  SubscriptionStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { AuthService } from '../auth/auth.service';
import { MercadoPagoService } from '../mercadopago/mercadopago.service';
import { UpdateSubscriptionAmountDto } from './dto/update-subscription-amount.dto';
import { UpdateReferralCodeDto } from '../auth/dto/update-referral-code.dto';
import { CreateJobDto } from './dto/create-job.dto';
import { ValidateProfileDto } from './dto/validate-profile.dto';
import { VerifyDocumentDto } from './dto/verify-document.dto';
import { AdminRegisterProfessionalDto } from './dto/admin-register-professional.dto';
import { AdminUpdateProfessionalDto } from './dto/admin-update-professional.dto';
import { AdminCreateUserDto } from './dto/admin-create-user.dto';
import { AdminUpdateUserDto } from './dto/admin-update-user.dto';
import { withoutDeleted } from '../common/filters/soft-delete.filter';
import type { StorageService } from '../uploads/storage.interface';
import { STORAGE_SERVICE } from '../uploads/storage.interface';
import { ProfessionalsCronService } from '../background-jobs/professionals-cron.service';
import { DiscountsCronService } from '../background-jobs/discounts-cron.service';
import { TrialReminderCronService } from '../background-jobs/trial-reminder-cron.service';
import { BaseCronService } from '../background-jobs/base-cron.service';
import { SubscriptionsCronBridge } from '../background-jobs/subscriptions-cron-bridge.service';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
    private readonly mercadopago: MercadoPagoService,
    private readonly professionalsCronService: ProfessionalsCronService,
    private readonly discountsCronService: DiscountsCronService,
    private readonly trialReminderCronService: TrialReminderCronService,
    private readonly subscriptionsCronBridge: SubscriptionsCronBridge,
    @Inject(STORAGE_SERVICE) private readonly storage: StorageService,
  ) {}

  private async resolveRolesByNames(roleNames: string[]) {
    if (!roleNames.length) {
      return [];
    }

    const normalizedNames = [...new Set(roleNames.map((role) => role.trim()))];
    const roles = await this.prisma.role.findMany({
      where: { name: { in: normalizedNames } },
      select: { id: true, name: true, type: true },
    });

    if (roles.length !== normalizedNames.length) {
      throw new BadRequestException('Some roles do not exist');
    }

    return roles;
  }

  /**
   * Reenvía el email de verificación al usuario de un perfil profesional.
   * Se usa desde el panel admin cuando el profesional aún no verificó su email.
   */
  async resendProfessionalVerification(profileId: string) {
    const profile = await this.prisma.professionalProfile.findUnique({
      where: withoutDeleted({ id: profileId }),
      include: { user: { select: { id: true } } },
    });

    if (!profile) {
      throw new NotFoundException('Professional profile not found');
    }

    return this.authService.resendVerificationByUserId(profile.user.id);
  }

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
      const professionalRole = await tx.role.findUnique({
        where: { name: 'professional' },
        select: { id: true },
      });

      if (!professionalRole) {
        throw new NotFoundException('Missing seeded role: professional');
      }

      return tx.user.create({
        data: {
          email: dto.email,
          passwordHash,
          userRoles: {
            create: [{ roleId: professionalRole.id }],
          },
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
              hideProfile: dto.hideProfile ?? false,
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
          userRoles: {
            include: { role: true },
          },
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

  async createAdminUser(dto: AdminCreateUserDto) {
    const existing = await this.prisma.user.findUnique({
      where: withoutDeleted({ email: dto.email }),
    });

    if (existing) {
      throw new ConflictException('Email already in use');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const roleNames = dto.roles?.length ? dto.roles : ['client'];
    const resolvedRoles = await this.resolveRolesByNames(roleNames);

    try {
      const user = await this.prisma.user.create({
        data: {
          email: dto.email,
          passwordHash,
          userRoles: {
            create: resolvedRoles.map((role) => ({ roleId: role.id })),
          },
          emailVerified: true,
        },
        select: {
          id: true,
          email: true,
          userRoles: {
            select: {
              role: {
                select: {
                  name: true,
                  type: true,
                },
              },
            },
          },
          emailVerified: true,
          createdAt: true,
          updatedAt: true,
          deletedAt: true,
        },
      });

      return {
        message: 'User created successfully',
        user,
      };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Email already in use');
      }
      throw error;
    }
  }

  async listAdminUsers(search?: string) {
    return this.prisma.user.findMany({
      where: withoutDeleted(
        search
          ? {
              email: {
                contains: search,
                mode: 'insensitive',
              },
            }
          : undefined,
      ),
      select: {
        id: true,
        email: true,
        userRoles: {
          select: {
            role: {
              select: {
                name: true,
                type: true,
              },
            },
          },
        },
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAdminUserById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: withoutDeleted({ id }),
      select: {
        id: true,
        email: true,
        userRoles: {
          select: {
            role: {
              select: {
                name: true,
                type: true,
              },
            },
          },
        },
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  assertCanMutateUser(authenticatedUserId: string, targetUserId: string) {
    if (authenticatedUserId === targetUserId) {
      throw new ForbiddenException('You cannot modify your own account');
    }
  }

  async updateAdminUser(
    authenticatedUserId: string,
    id: string,
    dto: AdminUpdateUserDto,
  ) {
    this.assertCanMutateUser(authenticatedUserId, id);

    const currentUser = await this.prisma.user.findUnique({
      where: withoutDeleted({ id }),
      select: {
        id: true,
        email: true,
        userRoles: {
          select: {
            role: {
              select: {
                name: true,
                type: true,
              },
            },
          },
        },
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
        deletedAt: true,
      },
    });

    if (!currentUser) {
      throw new NotFoundException('User not found');
    }

    if (dto.email !== undefined) {
      const existing = await this.prisma.user.findUnique({
        where: withoutDeleted({ email: dto.email }),
        select: { id: true },
      });

      if (existing && existing.id !== id) {
        throw new ConflictException('Email already in use');
      }
    }

    const data: Prisma.UserUpdateInput = {};

    if (dto.email !== undefined) {
      data.email = dto.email;
    }

    if (dto.roles !== undefined) {
      const roles = await this.resolveRolesByNames(dto.roles);
      data.userRoles = {
        deleteMany: {},
        create: roles.map((role) => ({ roleId: role.id })),
      };
    }

    if (dto.password !== undefined) {
      data.passwordHash = await bcrypt.hash(dto.password, 10);
    }

    if (Object.keys(data).length === 0) {
      return currentUser;
    }

    try {
      return await this.prisma.user.update({
        where: withoutDeleted({ id }),
        data,
        select: {
          id: true,
          email: true,
          userRoles: {
            select: {
              role: {
                select: {
                  name: true,
                  type: true,
                },
              },
            },
          },
          emailVerified: true,
          createdAt: true,
          updatedAt: true,
          deletedAt: true,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Email already in use');
      }
      throw error;
    }
  }

  async softDeleteAdminUser(authenticatedUserId: string, id: string) {
    this.assertCanMutateUser(authenticatedUserId, id);

    const user = await this.prisma.user.findUnique({
      where: withoutDeleted({ id }),
      include: { profile: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const deletedAt = new Date();

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: withoutDeleted({ id }),
        data: { deletedAt },
      }),
      this.prisma.professionalProfile.updateMany({
        where: withoutDeleted({ userId: id }),
        data: { deletedAt },
      }),
    ]);

    return { message: 'User deleted successfully' };
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
          user: {
            select: {
              id: true,
              email: true,
              emailVerified: true,
              lastLoginAt: true,
            },
          },
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

    // Borrar fotos de DNI una vez confirmada la identidad
    if (isApproved) {
      await this._deleteIdentityFiles(profile);
    }

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

    return documents.map(
      ({ education, certification, profession, ...document }) => ({
        ...document,
        professionName: profession?.name ?? null,
        educationTitle: education?.title ?? null,
        educationInstitution: education?.institution ?? null,
        educationYear: education?.year ?? null,
        certificationName: certification?.name ?? null,
      }),
    );
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
    if (dto.hideProfile !== undefined) data.hideProfile = dto.hideProfile;
    if (dto.rubroId !== undefined)
      data.rubro = { connect: { id: dto.rubroId } };
    if (dto.countryId !== undefined)
      data.country = { connect: { id: dto.countryId } };
    if (dto.provinceId !== undefined)
      data.province = { connect: { id: dto.provinceId } };
    if (dto.profileStatus !== undefined) data.profileStatus = dto.profileStatus;
    if (dto.trialEndDate !== undefined)
      data.trialEndDate = new Date(dto.trialEndDate);
    if (dto.professionCategoryIds !== undefined) {
      data.professionCategories = {
        set: dto.professionCategoryIds.map((categoryId) => ({
          id: categoryId,
        })),
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

  async changeProfessionalPassword(profileId: string, password: string) {
    const profile = await this.findProfileOrThrow(profileId);
    const passwordHash = await bcrypt.hash(password, 10);

    await this.prisma.user.update({
      where: withoutDeleted({ id: profile.userId }),
      data: { passwordHash },
    });

    return { message: 'Password updated' };
  }

  // ─── Jobs ────────────────────────────────────────────────────────────────

  getAvailableJobs() {
    let cronSchedule: Record<string, string | null> = {};
    try {
      const raw = this.configService.get<string>('CRON_SCHEDULE');
      if (raw) cronSchedule = JSON.parse(raw);
    } catch {
      // Ignore invalid JSON and expose defaults without schedules.
    }

    const JOB_METADATA = [
      { key: 'expiredTrials', name: 'Vencimiento de trials' },
      { key: 'expiredCancelledSubs', name: 'Suscripciones canceladas' },
      { key: 'subscriptionRenewals', name: 'Renovación de suscripciones' },
      { key: 'applyDiscounts', name: 'Aplicar descuentos' },
      { key: 'restoreDiscounts', name: 'Restaurar descuentos' },
      { key: 'trialExpiringReminder', name: 'Aviso vencimiento de trial' },
      { key: 'dailyDigest', name: 'Digest diario de canales' },
    ];

    return JOB_METADATA.map((job) => ({
      key: job.key,
      name: job.name,
      schedule: cronSchedule[job.key] ?? null,
      active: typeof cronSchedule[job.key] === 'string',
    }));
  }

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

  async getJobExecutions(filters: {
    page: number;
    sizePage: number;
    jobName?: string;
  }) {
    const where = filters.jobName ? { jobName: filters.jobName } : {};
    const [data, total] = await Promise.all([
      this.prisma.jobExecution.findMany({
        where,
        orderBy: { startedAt: 'desc' },
        skip: (filters.page - 1) * filters.sizePage,
        take: filters.sizePage,
      }),
      this.prisma.jobExecution.count({ where }),
    ]);

    return {
      data,
      total,
      page: filters.page,
      sizePage: filters.sizePage,
    };
  }

  async triggerJob(
    jobName: string,
  ): Promise<{ message: string; jobName: string }> {
    const services: BaseCronService[] = [
      this.professionalsCronService,
      this.discountsCronService,
      this.trialReminderCronService,
      this.subscriptionsCronBridge,
    ];

    const owner = services.find((service) => service.hasJob(jobName));
    if (!owner) throw new NotFoundException(`Job "${jobName}" no encontrado`);

    owner.triggerManually(jobName).catch(() => {});

    return { message: 'Job iniciado en background', jobName };
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
          userRoles: {
            select: {
              role: {
                select: {
                  name: true,
                  type: true,
                },
              },
            },
          },
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
            userRoles: {
              select: {
                role: {
                  select: {
                    name: true,
                    type: true,
                  },
                },
              },
            },
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

  // ─── Identity files ──────────────────────────────────────────────────────

  /**
   * Borra las fotos de DNI (frente y dorso) del storage y limpia las URLs
   * del perfil en la DB. Se llama solo al confirmar la identidad del profesional.
   */
  private async _deleteIdentityFiles(profile: {
    id: string;
    identityFrontUrl: string | null;
    identityBackUrl: string | null;
  }) {
    const toDelete: string[] = [];
    if (profile.identityFrontUrl)
      toDelete.push(profile.identityFrontUrl.replace('/uploads/', ''));
    if (profile.identityBackUrl)
      toDelete.push(profile.identityBackUrl.replace('/uploads/', ''));

    if (toDelete.length === 0) return;

    await Promise.allSettled(toDelete.map((p) => this.storage.delete(p)));

    await this.prisma.professionalProfile.update({
      where: { id: profile.id },
      data: { identityFrontUrl: null, identityBackUrl: null },
    });
  }

  // ─── Subscription amount ─────────────────────────────────────────────────

  /**
   * Actualiza el monto de cobro de una suscripción activa en Mercado Pago
   * y limpia los campos de descuento en la DB.
   * Solo aplica a suscripciones con PreApproval (mp_subscription / mp_bricks_subscription).
   */
  async updateSubscriptionAmount(id: string, dto: UpdateSubscriptionAmountDto) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id },
      include: { plan: true },
    });

    if (!subscription) {
      throw new NotFoundException('Suscripción no encontrada');
    }

    if (!subscription.externalId) {
      throw new UnprocessableEntityException(
        'Esta suscripción no tiene un PreApproval activo en Mercado Pago',
      );
    }

    const validStrategies = ['mp_subscription', 'mp_bricks_subscription'];
    if (
      !subscription.paymentStrategy ||
      !validStrategies.includes(subscription.paymentStrategy)
    ) {
      throw new UnprocessableEntityException(
        `La estrategia de pago "${subscription.paymentStrategy}" no soporta actualización de monto`,
      );
    }

    // Actualizar en MP
    await this.mercadopago.updatePreapprovalAmount(
      subscription.externalId,
      dto.amount,
    );

    // Limpiar descuento y registrar nuevo monto en DB
    const updated = await this.prisma.subscription.update({
      where: { id },
      data: {
        discountPlanId: null,
        discountedAmount: null,
        discountAppliedAt: null,
        discountExpiresAt: null,
      },
    });

    return {
      subscriptionId: updated.id,
      preapprovalId: subscription.externalId,
      newAmount: dto.amount,
      updatedAt: updated.updatedAt,
    };
  }

  // ─── Referral code (admin) ────────────────────────────────────────────────

  /** Devuelve el referralCode de cualquier usuario (por userId). */
  async getUserReferralCode(
    userId: string,
  ): Promise<{ referralCode: string | null }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { referralCode: true },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');
    return { referralCode: user.referralCode };
  }

  /** Setea o cambia el referralCode de cualquier usuario. Valida unicidad. */
  async setUserReferralCode(
    userId: string,
    dto: UpdateReferralCodeDto,
  ): Promise<{ referralCode: string }> {
    const code = dto.referralCode.trim();

    const existing = await this.prisma.user.findFirst({
      where: { referralCode: code },
    });
    if (existing && existing.id !== userId) {
      throw new ConflictException(
        'Ese código de referido ya está en uso por otro usuario',
      );
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { referralCode: code },
      select: { referralCode: true },
    });

    return { referralCode: updated.referralCode! };
  }
}
