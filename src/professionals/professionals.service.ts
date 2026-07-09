import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProfessionalDto } from './dto/create-professional.dto';
import { UpdateProfessionalDto } from './dto/update-professional.dto';
import { UpdatePersonalDto } from './dto/update-personal.dto';
import { UpdateProfessionalInfoDto } from './dto/update-professional-info.dto';
import { CreateEducationDto } from './dto/create-education.dto';
import { CreateCertificationDto } from './dto/create-certification.dto';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';
import { UpdateMotivationDto } from './dto/update-motivation.dto';
import {
  ProfessionalProfile,
  Prisma,
  SubscriptionStatus,
} from '@prisma/client';
import { withoutDeleted } from '../common/filters/soft-delete.filter';

@Injectable()
export class ProfessionalsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Queries existentes ──────────────────────────────────────────────────

  async findFeatured(): Promise<ProfessionalProfile[]> {
    const rows = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT pp.id FROM professional_profiles pp
      JOIN users u ON u.id = pp.user_id
      WHERE pp.is_active = true
        AND pp.hide_profile = false
        AND pp.profile_status = 'active'
        AND u.email_verified = true
        AND (
          (pp.trial_end_date IS NOT NULL AND pp.trial_end_date >= NOW())
          OR EXISTS (
            SELECT 1 FROM subscriptions s
            WHERE s.user_id = u.id AND s.status = 'active'
          )
        )
      ORDER BY RANDOM()
      LIMIT 8
    `;

    const profiles = await this.prisma.professionalProfile.findMany({
      where: withoutDeleted({ id: { in: rows.map((r) => r.id) } }),
      include: { professionCategories: true, rubro: true },
    });

    const order = new Map(rows.map((r, i) => [r.id, i]));
    return profiles.sort(
      (a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0),
    );
  }

  async findAll(page: number, sizePage: number) {
    const where: Prisma.ProfessionalProfileWhereInput = {
      deletedAt: null,
      isActive: true,
      hideProfile: false,
      profileStatus: 'active' as const,
      user: { emailVerified: true },
      OR: [
        { trialEndDate: { gte: new Date() } },
        {
          user: {
            subscriptions: { some: { status: SubscriptionStatus.active } },
          },
        },
      ],
    };
    const [data, total] = await Promise.all([
      this.prisma.professionalProfile.findMany({
        where,
        include: { professionCategories: true, rubro: true },
        skip: (page - 1) * sizePage,
        take: sizePage,
      }),
      this.prisma.professionalProfile.count({ where }),
    ]);
    return { data, total, page, sizePage };
  }

  async findByUserId(userId: string) {
    const profile = await this.prisma.professionalProfile.findFirst({
      where: withoutDeleted({ userId }),
      include: {
        professionCategories: true,
        rubro: true,
        educations: { include: { documents: true } },
        certifications: { include: { documents: true } },
        documents: true,
        validations: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });

    if (!profile) {
      throw new NotFoundException(
        `Professional profile for user ${userId} not found`,
      );
    }

    return profile;
  }

  async findOne(id: string) {
    const numericId = parseInt(id, 10);
    const isNumeric = !isNaN(numericId) && String(numericId) === id;

    const profile = await this.prisma.professionalProfile.findFirst({
      where: {
        deletedAt: null,
        ...(isNumeric ? { publicId: numericId } : { id }),
        isActive: true,
        hideProfile: false,
        profileStatus: 'active',
        user: { emailVerified: true },
        OR: [
          { trialEndDate: { gte: new Date() } },
          {
            user: {
              subscriptions: { some: { status: SubscriptionStatus.active } },
            },
          },
        ],
      },
      include: { professionCategories: true, rubro: true },
    });

    if (!profile) {
      throw new NotFoundException(
        `Professional profile with id ${id} not found`,
      );
    }

    return profile;
  }

  async findBySlug(slug: string) {
    const lastDash = slug.lastIndexOf('-');
    if (lastDash === -1) {
      throw new NotFoundException('Perfil no encontrado');
    }

    const publicId = parseInt(slug.substring(lastDash + 1), 10);
    if (Number.isNaN(publicId)) {
      throw new NotFoundException('Perfil no encontrado');
    }

    const profile = await this.prisma.professionalProfile.findUnique({
      where: { publicId },
      include: { professionCategories: true, rubro: true },
    });

    if (
      !profile ||
      profile.deletedAt ||
      !profile.isActive ||
      profile.hideProfile ||
      profile.profileStatus !== 'active'
    ) {
      throw new NotFoundException('Perfil no encontrado');
    }

    const emailVerifiedUser = await this.prisma.user.findUnique({
      where: { id: profile.userId },
      select: { emailVerified: true },
    });

    if (!emailVerifiedUser?.emailVerified) {
      throw new NotFoundException('Perfil no encontrado');
    }

    const now = new Date();
    const hasActiveTrial = profile.trialEndDate && profile.trialEndDate >= now;
    const hasActiveSubscription = await this.prisma.subscription.findFirst({
      where: { userId: profile.userId, status: SubscriptionStatus.active },
      select: { id: true },
    });

    if (!hasActiveTrial && !hasActiveSubscription) {
      throw new NotFoundException('Perfil no encontrado');
    }

    return profile;
  }

  // ─── Create / Update genérico (legacy) ───────────────────────────────────

  async create(userId: string, dto: CreateProfessionalDto) {
    // If emailContact is not provided, default to the user's email
    const emailContact =
      dto.emailContact ??
      (
        await this.prisma.user.findUniqueOrThrow({
          where: withoutDeleted({ id: userId }),
          select: { email: true },
        })
      ).email;

    const data: Prisma.ProfessionalProfileCreateInput = {
      user: { connect: { id: userId } },
      name: dto.name,
      bio: dto.bio,
      photo: dto.photo,
      services: dto.services ?? [],
      city: dto.city,
      address: dto.address,
      rubro: dto.rubroId ? { connect: { id: dto.rubroId } } : undefined,
      professionCategories: {
        connect: (dto.professionCategoryIds ?? []).map((id) => ({ id })),
      },
      whatsapp: dto.whatsapp,
      emailContact,
      hideProfile: dto.hideProfile ?? false,
    };

    const profile = await this.prisma.professionalProfile.create({
      data,
      include: { professionCategories: true },
    });

    const completionPct = this.calculateCompletion(profile);
    return this.prisma.professionalProfile.update({
      where: withoutDeleted({ id: profile.id }),
      data: { completionPct },
    });
  }

  async update(userId: string, id: string, dto: UpdateProfessionalDto) {
    const profile = await this.getOwnProfile(userId, id);

    const { professionCategoryIds, rubroId, ...rest } = dto;

    const updateData: Prisma.ProfessionalProfileUpdateInput = {
      ...rest,
      ...(rubroId ? { rubro: { connect: { id: rubroId } } } : {}),
      ...(professionCategoryIds
        ? {
            professionCategories: {
              set: professionCategoryIds.map((id) => ({ id })),
            },
          }
        : {}),
    };

    const updated = await this.prisma.professionalProfile.update({
      where: withoutDeleted({ id }),
      data: updateData,
      include: { professionCategories: true },
    });

    const completionPct = this.calculateCompletion(updated);
    return this.prisma.professionalProfile.update({
      where: withoutDeleted({ id }),
      data: { completionPct },
    });
  }

  // ─── Endpoints por seccion (wizard / dashboard) ──────────────────────────

  async updatePersonal(userId: string, id: string, dto: UpdatePersonalDto) {
    const profile = await this.getOwnProfile(userId, id);

    const updated = await this.prisma.professionalProfile.update({
      where: withoutDeleted({ id: profile.id }),
      data: {
        ...dto,
        birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
        pricePerHour: dto.pricePerHour
          ? new Prisma.Decimal(dto.pricePerHour)
          : undefined,
        currentStep: Math.max(profile.currentStep, 2),
      },
      include: { professionCategories: true },
    });

    return this.recalculateAndReturn(updated);
  }

  async updateProfessionalInfo(
    userId: string,
    id: string,
    dto: UpdateProfessionalInfoDto,
  ) {
    const profile = await this.getOwnProfile(userId, id);

    const { professionCategoryIds, services, ...rest } = dto;

    // Validate professionCategoryIds belong to the professional's rubro
    if (
      professionCategoryIds &&
      professionCategoryIds.length > 0 &&
      profile.rubroId
    ) {
      const validCategories = await this.prisma.professionCategory.findMany({
        where: {
          id: { in: professionCategoryIds },
          level: 3,
          isActive: true,
          parent: { parentId: profile.rubroId },
        },
      });

      if (validCategories.length !== professionCategoryIds.length) {
        throw new BadRequestException(
          'Algunas profesiones seleccionadas no pertenecen a tu rubro. Selecciona profesiones validas.',
        );
      }
    }

    const updated = await this.prisma.professionalProfile.update({
      where: withoutDeleted({ id: profile.id }),
      data: {
        ...rest,
        ...(services ? { services } : {}),
        ...(professionCategoryIds
          ? {
              professionCategories: {
                set: professionCategoryIds.map((id) => ({ id })),
              },
            }
          : {}),
        currentStep: Math.max(profile.currentStep, 3),
      },
      include: { professionCategories: true },
    });

    return this.recalculateAndReturn(updated);
  }

  // ─── Education CRUD ──────────────────────────────────────────────────────

  async addEducation(
    userId: string,
    profileId: string,
    dto: CreateEducationDto,
  ) {
    const profile = await this.getOwnProfile(userId, profileId);

    const education = await this.prisma.education.create({
      data: {
        professionalId: profile.id,
        ...dto,
      },
    });

    await this.prisma.professionalProfile.update({
      where: withoutDeleted({ id: profile.id }),
      data: { currentStep: Math.max(profile.currentStep, 4) },
    });

    return education;
  }

  async updateEducation(
    userId: string,
    profileId: string,
    educationId: string,
    dto: CreateEducationDto,
  ) {
    await this.getOwnProfile(userId, profileId);

    return this.prisma.education.update({
      where: { id: educationId },
      data: dto,
    });
  }

  async deleteEducation(
    userId: string,
    profileId: string,
    educationId: string,
  ) {
    await this.getOwnProfile(userId, profileId);

    await this.prisma.education.delete({ where: { id: educationId } });
    return { deleted: true };
  }

  async getEducations(userId: string, profileId: string) {
    await this.getOwnProfile(userId, profileId);

    return this.prisma.education.findMany({
      where: { professionalId: profileId },
      include: { documents: true },
      orderBy: { year: 'desc' },
    });
  }

  // ─── Certification CRUD ──────────────────────────────────────────────────

  async addCertification(
    userId: string,
    profileId: string,
    dto: CreateCertificationDto,
  ) {
    const profile = await this.getOwnProfile(userId, profileId);

    const certification = await this.prisma.certification.create({
      data: {
        professionalId: profile.id,
        ...dto,
      },
    });

    await this.prisma.professionalProfile.update({
      where: withoutDeleted({ id: profile.id }),
      data: { currentStep: Math.max(profile.currentStep, 5) },
    });

    return certification;
  }

  async updateCertification(
    userId: string,
    profileId: string,
    certId: string,
    dto: CreateCertificationDto,
  ) {
    await this.getOwnProfile(userId, profileId);

    return this.prisma.certification.update({
      where: { id: certId },
      data: dto,
    });
  }

  async deleteCertification(userId: string, profileId: string, certId: string) {
    await this.getOwnProfile(userId, profileId);

    await this.prisma.certification.delete({ where: { id: certId } });
    return { deleted: true };
  }

  async getCertifications(userId: string, profileId: string) {
    await this.getOwnProfile(userId, profileId);

    return this.prisma.certification.findMany({
      where: { professionalId: profileId },
      include: { documents: true },
      orderBy: { year: 'desc' },
    });
  }

  // ─── Preferences & Motivation ────────────────────────────────────────────

  async updatePreferences(
    userId: string,
    id: string,
    dto: UpdatePreferencesDto,
  ) {
    const profile = await this.getOwnProfile(userId, id);

    const updated = await this.prisma.professionalProfile.update({
      where: withoutDeleted({ id: profile.id }),
      data: {
        ...dto,
        currentStep: Math.max(profile.currentStep, 7),
      },
      include: { professionCategories: true },
    });

    return this.recalculateAndReturn(updated);
  }

  async updateMotivation(userId: string, id: string, dto: UpdateMotivationDto) {
    const profile = await this.getOwnProfile(userId, id);

    const updated = await this.prisma.professionalProfile.update({
      where: withoutDeleted({ id: profile.id }),
      data: {
        tramaMotivation: dto.tramaMotivation,
        currentStep: Math.max(profile.currentStep, 8),
      },
      include: { professionCategories: true },
    });

    return this.recalculateAndReturn(updated);
  }

  // ─── Submit para revision ────────────────────────────────────────────────

  async submitForReview(userId: string, id: string) {
    const profile = await this.getOwnProfile(userId, id);

    // Validar campos obligatorios
    const missing: string[] = [];
    if (!profile.name) missing.push('nombre');
    if (!profile.dni) missing.push('DNI');
    if (!profile.city) missing.push('ciudad');

    if (missing.length > 0) {
      throw new BadRequestException(
        `Faltan campos obligatorios: ${missing.join(', ')}`,
      );
    }

    // Verificar que tiene al menos un documento CV
    const cvDoc = await this.prisma.document.findFirst({
      where: { professionalId: profile.id, type: 'cv' },
    });

    if (!cvDoc) {
      throw new BadRequestException(
        'Debes subir tu CV antes de enviar para revision',
      );
    }

    const updated = await this.prisma.professionalProfile.update({
      where: withoutDeleted({ id: profile.id }),
      data: {
        profileStatus: 'pending_review',
        submittedAt: new Date(),
        isFirstTime: false,
        currentStep: 9,
        termsAccepted: true,
        dataConsentAccepted: true,
      },
    });

    return updated;
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────

  private async getOwnProfile(userId: string, id: string) {
    const profile = await this.prisma.professionalProfile.findUnique({
      where: withoutDeleted({ id }),
    });

    if (!profile) {
      throw new NotFoundException(
        `Professional profile with id ${id} not found`,
      );
    }

    if (profile.userId !== userId) {
      throw new ForbiddenException(
        'You are not allowed to modify this profile',
      );
    }

    return profile;
  }

  private async recalculateAndReturn(
    profile: ProfessionalProfile & { professionCategories: any[] },
  ) {
    const completionPct = this.calculateCompletion(profile);
    return this.prisma.professionalProfile.update({
      where: withoutDeleted({ id: profile.id }),
      data: { completionPct },
    });
  }

  private calculateCompletion(
    profile: ProfessionalProfile & { professionCategories: any[] },
  ): number {
    const checks: boolean[] = [
      Boolean(profile.name),
      Boolean(profile.bio),
      Boolean(profile.photo),
      Array.isArray(profile.services) && profile.services.length > 0,
      profile.pricePerHour !== null,
      Boolean(profile.city),
      Boolean(profile.rubroId),
      Array.isArray(profile.professionCategories) &&
        profile.professionCategories.length > 0,
      Boolean(profile.whatsapp) || Boolean(profile.emailContact),
      Boolean(profile.dni),
    ];

    const filled = checks.filter(Boolean).length;
    return Math.round((filled / checks.length) * 100);
  }
}
