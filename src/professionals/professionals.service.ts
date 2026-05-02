import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProfessionalDto } from './dto/create-professional.dto';
import { UpdateProfessionalDto } from './dto/update-professional.dto';
import { ProfessionalProfile, Prisma } from '@prisma/client';

@Injectable()
export class ProfessionalsService {
  constructor(private readonly prisma: PrismaService) {}

  async findFeatured(): Promise<ProfessionalProfile[]> {
    const rows = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM professional_profiles
      WHERE is_active = true
      ORDER BY RANDOM()
      LIMIT 6
    `;

    const profiles = await this.prisma.professionalProfile.findMany({
      where: { id: { in: rows.map((r) => r.id) } },
      include: { categories: true },
    });

    // Restore random order from the raw query (findMany ignores IN clause order)
    const order = new Map(rows.map((r, i) => [r.id, i]));
    return profiles.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
  }

  async findAll(page: number, sizePage: number): Promise<{ data: ProfessionalProfile[]; total: number; page: number; sizePage: number }> {
    const where = { isActive: true };
    const [data, total] = await Promise.all([
      this.prisma.professionalProfile.findMany({
        where,
        include: { categories: true },
        skip: (page - 1) * sizePage,
        take: sizePage,
      }),
      this.prisma.professionalProfile.count({ where }),
    ]);
    return { data, total, page, sizePage };
  }

  async findByUserId(userId: string): Promise<ProfessionalProfile> {
    const profile = await this.prisma.professionalProfile.findFirst({
      where: { userId },
      include: { categories: true },
    });

    if (!profile) {
      throw new NotFoundException(`Professional profile for user ${userId} not found`);
    }

    return profile;
  }

  async findOne(id: string): Promise<ProfessionalProfile> {
    const profile = await this.prisma.professionalProfile.findFirst({
      where: { id, isActive: true },
      include: { categories: true },
    });

    if (!profile) {
      throw new NotFoundException(`Professional profile with id ${id} not found`);
    }

    return profile;
  }

  async create(userId: string, dto: CreateProfessionalDto): Promise<ProfessionalProfile> {
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

  async update(
    userId: string,
    id: string,
    dto: UpdateProfessionalDto,
  ): Promise<ProfessionalProfile> {
    const profile = await this.prisma.professionalProfile.findUnique({
      where: { id },
    });

    if (!profile) {
      throw new NotFoundException(`Professional profile with id ${id} not found`);
    }

    if (profile.userId !== userId) {
      throw new ForbiddenException('You are not allowed to update this profile');
    }

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

  private calculateCompletion(profile: ProfessionalProfile & { categories: any[] }): number {
    const checks: boolean[] = [
      Boolean(profile.name),
      Boolean(profile.bio),
      Boolean(profile.photo),
      Array.isArray(profile.services) && profile.services.length > 0,
      profile.priceMin !== null,
      profile.priceMax !== null,
      Boolean(profile.city),
      Array.isArray(profile.categories) && profile.categories.length > 0,
      Boolean(profile.whatsapp) || Boolean(profile.emailContact),
    ];

    const filled = checks.filter(Boolean).length;
    return Math.round((filled / checks.length) * 100);
  }
}
