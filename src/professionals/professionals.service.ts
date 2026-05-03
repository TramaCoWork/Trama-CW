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
import { ProfessionalProfile, Prisma } from '@prisma/client';

@Injectable()
export class ProfessionalsService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Queries existentes ──────────────────────────────────────────────────

  async findFeatured(): Promise<ProfessionalProfile[]> {
    const rows = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM professional_profiles
      WHERE is_active = true
      ORDER BY RANDOM()
      LIMIT 6
    `;

    const profiles = await this.prisma.professionalProfile.findMany({
      where: { id: { in: rows.map((r) => r.id) } },
      include: { categories: true, professionCategories: true },
    });

    const order = new Map(rows.map((r, i) => [r.id, i]));
    return profiles.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
  }

  async findAll(page: number, sizePage: number) {
    const where = { isActive: true };
    const [data, total] = await Promise.all([
      this.prisma.professionalProfile.findMany({
        where,
        include: { categories: true, professionCategories: true },
        skip: (page - 1) * sizePage,
        take: sizePage,
      }),
      this.prisma.professionalProfile.count({ where }),
    ]);
    return { data, total, page, sizePage };
  }

  async findByUserId(userId: string) {
    const profile = await this.prisma.professionalProfile.findFirst({
      where: { userId },
      include: {
        categories: true,
        professionCategories: true,
        educations: { include: { documents: true } },
        certifications: { include: { documents: true } },
        documents: true,
        validations: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });

    if (!profile) {
      throw new NotFoundException(`Professional profile for user ${userId} not found`);
    }

    return profile;
  }

  async findOne(id: string) {
    const profile = await this.prisma.professionalProfile.findFirst({
      where: { id, isActive: true },
      include: { categories: true, professionCategories: true },
    });

    if (!profile) {
      throw new NotFoundException(`Professional profile with id ${id} not found`);
    }

    return profile;
  }

  // ─── Create / Update genérico (legacy) ───────────────────────────────────

  async create(userId: string, dto: CreateProfessionalDto) {
    const data: Prisma.ProfessionalProfileCreateInput = {
      user: { connect: { id: userId } },
      name: dto.name,
      bio: dto.bio,
      photo: dto.photo,
      services: dto.services ?? [],
      priceMin: dto.priceMin != null ? new Prisma.Decimal(dto.priceMin) : undefined,
      priceMax: dto.priceMax != null ? new Prisma.Decimal(dto.priceMax) : undefined,
      city: dto.city,
      categories: {
        connect: (dto.categories ?? []).map((id) => ({ id })),
      },
      whatsapp: dto.whatsapp,
      emailContact: dto.emailContact,
    };

    const profile = await this.prisma.professionalProfile.create({
      data,
      include: { categories: true },
    });

    const completionPct = this.calculateCompletion(profile);
    return this.prisma.professionalProfile.update({
      where: { id: profile.id },
      data: { completionPct },
    });
  }

  async update(userId: string, id: string, dto: UpdateProfessionalDto) {
    const profile = await this.getOwnProfile(userId, id);

    const { categories: categoryIds, ...rest } = dto;

    const updateData: Prisma.ProfessionalProfileUpdateInput = {
      ...rest,
      priceMin: dto.priceMin != null ? new Prisma.Decimal(dto.priceMin) : undefined,
      priceMax: dto.priceMax != null ? new Prisma.Decimal(dto.priceMax) : undefined,
      ...(categoryIds ? {
        categories: { set: categoryIds.map((id) => ({ id })) },
      } : {}),
    };

    const updated = await this.prisma.professionalProfile.update({
      where: { id },
      data: updateData,
      include: { categories: true },
    });

    const completionPct = this.calculateCompletion(updated);
    return this.prisma.professionalProfile.update({
      where: { id },
      data: { completionPct },
    });
  }

  // ─── Endpoints por seccion (wizard / dashboard) ──────────────────────────

  async updatePersonal(userId: string, id: string, dto: UpdatePersonalDto) {
    const profile = await this.getOwnProfile(userId, id);

    const updated = await this.prisma.professionalProfile.update({
      where: { id: profile.id },
      data: {
        ...dto,
        birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
        pricePerHour: dto.pricePerHour ? new Prisma.Decimal(dto.pricePerHour) : undefined,
        currentStep: Math.max(profile.currentStep, 2),
      },
      include: { categories: true },
    });

    return this.recalculateAndReturn(updated);
  }

  async updateProfessionalInfo(userId: string, id: string, dto: UpdateProfessionalInfoDto) {
    const profile = await this.getOwnProfile(userId, id);

    const { professionCategoryIds, services, ...rest } = dto;

    const updated = await this.prisma.professionalProfile.update({
      where: { id: profile.id },
      data: {
        ...rest,
        ...(services ? { services } : {}),
        ...(professionCategoryIds ? {
          professionCategories: { set: professionCategoryIds.map((id) => ({ id })) },
        } : {}),
        currentStep: Math.max(profile.currentStep, 3),
      },
      include: { categories: true },
    });

    return this.recalculateAndReturn(updated);
  }

  // ─── Education CRUD ──────────────────────────────────────────────────────

  async addEducation(userId: string, profileId: string, dto: CreateEducationDto) {
    const profile = await this.getOwnProfile(userId, profileId);

    const education = await this.prisma.education.create({
      data: {
        professionalId: profile.id,
        ...dto,
      },
    });

    await this.prisma.professionalProfile.update({
      where: { id: profile.id },
      data: { currentStep: Math.max(profile.currentStep, 4) },
    });

    return education;
  }

  async updateEducation(userId: string, profileId: string, educationId: string, dto: CreateEducationDto) {
    await this.getOwnProfile(userId, profileId);

    return this.prisma.education.update({
      where: { id: educationId },
      data: dto,
    });
  }

  async deleteEducation(userId: string, profileId: string, educationId: string) {
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

  async addCertification(userId: string, profileId: string, dto: CreateCertificationDto) {
    const profile = await this.getOwnProfile(userId, profileId);

    const certification = await this.prisma.certification.create({
      data: {
        professionalId: profile.id,
        ...dto,
      },
    });

    await this.prisma.professionalProfile.update({
      where: { id: profile.id },
      data: { currentStep: Math.max(profile.currentStep, 5) },
    });

    return certification;
  }

  async updateCertification(userId: string, profileId: string, certId: string, dto: CreateCertificationDto) {
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

  async updatePreferences(userId: string, id: string, dto: UpdatePreferencesDto) {
    const profile = await this.getOwnProfile(userId, id);

    const updated = await this.prisma.professionalProfile.update({
      where: { id: profile.id },
      data: {
        ...dto,
        currentStep: Math.max(profile.currentStep, 7),
      },
      include: { categories: true },
    });

    return this.recalculateAndReturn(updated);
  }

  async updateMotivation(userId: string, id: string, dto: UpdateMotivationDto) {
    const profile = await this.getOwnProfile(userId, id);

    const updated = await this.prisma.professionalProfile.update({
      where: { id: profile.id },
      data: {
        tramaMotivation: dto.tramaMotivation,
        currentStep: Math.max(profile.currentStep, 8),
      },
      include: { categories: true },
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
    if (!profile.tramaMotivation) missing.push('motivacion');

    if (missing.length > 0) {
      throw new BadRequestException(`Faltan campos obligatorios: ${missing.join(', ')}`);
    }

    // Verificar que tiene al menos un documento CV
    const cvDoc = await this.prisma.document.findFirst({
      where: { professionalId: profile.id, type: 'cv' },
    });

    if (!cvDoc) {
      throw new BadRequestException('Debes subir tu CV antes de enviar para revision');
    }

    const updated = await this.prisma.professionalProfile.update({
      where: { id: profile.id },
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
      where: { id },
    });

    if (!profile) {
      throw new NotFoundException(`Professional profile with id ${id} not found`);
    }

    if (profile.userId !== userId) {
      throw new ForbiddenException('You are not allowed to modify this profile');
    }

    return profile;
  }

  private async recalculateAndReturn(profile: ProfessionalProfile & { categories: any[] }) {
    const completionPct = this.calculateCompletion(profile);
    return this.prisma.professionalProfile.update({
      where: { id: profile.id },
      data: { completionPct },
    });
  }

  private calculateCompletion(profile: ProfessionalProfile & { categories: any[] }): number {
    const checks: boolean[] = [
      Boolean(profile.name),
      Boolean(profile.bio),
      Boolean(profile.photo),
      Array.isArray(profile.services) && profile.services.length > 0,
      profile.priceMin !== null || profile.pricePerHour !== null,
      Boolean(profile.city),
      Array.isArray(profile.categories) && profile.categories.length > 0,
      Boolean(profile.whatsapp) || Boolean(profile.emailContact),
      Boolean(profile.dni),
      Boolean(profile.mainProfession),
      Boolean(profile.tramaMotivation),
    ];

    const filled = checks.filter(Boolean).length;
    return Math.round((filled / checks.length) * 100);
  }
}
