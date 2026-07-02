import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  ProfessionalProfile,
  Prisma,
  SubscriptionStatus,
} from '@prisma/client';

export interface SearchQuery {
  q?: string;
  rubro?: string;
  sub_rubro?: string;
  city?: string;
  modality?: string;
  industry?: string;
  years_min?: string;
  years_max?: string;
  profession_category?: string;
  countryId?: string;
  provinceId?: string;
}

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(query: SearchQuery): Promise<ProfessionalProfile[]> {
    const where: Prisma.ProfessionalProfileWhereInput = {
      deletedAt: null,
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
    };

    if (query.city) {
      where.city = { contains: query.city, mode: 'insensitive' };
    }

    if (query.rubro) {
      where.rubro = { slug: query.rubro };
    }

    if (query.modality) {
      where.workModality = query.modality as any;
    }

    if (query.industry) {
      where.industry = { contains: query.industry, mode: 'insensitive' };
    }

    if (query.years_min !== undefined) {
      where.yearsExperience = {
        ...((where.yearsExperience as any) || {}),
        gte: parseInt(query.years_min),
      };
    }

    if (query.years_max !== undefined) {
      where.yearsExperience = {
        ...((where.yearsExperience as any) || {}),
        lte: parseInt(query.years_max),
      };
    }

    if (query.profession_category) {
      where.professionCategories = {
        some: { slug: query.profession_category },
      };
    }

    if (query.sub_rubro) {
      where.professionCategories = {
        ...where.professionCategories,
        some: {
          ...(where.professionCategories as any)?.some,
          parent: { slug: query.sub_rubro, level: 2 },
        },
      };
    }

    if (query.countryId) {
      where.countryId = parseInt(query.countryId);
    }

    if (query.provinceId) {
      where.provinceId = parseInt(query.provinceId);
    }

    // Búsqueda de texto libre sobre name, services y profession_categories.name.
    // Insensible a acentos y mayúsculas vía unaccent + lower de PostgreSQL
    // (Prisma no soporta unaccent, por eso se resuelve con SQL crudo y luego se
    // combina por IDs respetando los filtros de visibilidad del where principal).
    if (query.q?.trim()) {
      const pattern = `%${query.q.trim()}%`;

      const [profileRows, categoryRows] = await Promise.all([
        this.prisma.$queryRaw<{ id: string }[]>`
          SELECT id FROM professional_profiles
          WHERE unaccent(lower(name)) LIKE unaccent(lower(${pattern}))
             OR EXISTS (
               SELECT 1 FROM unnest(services) AS service
               WHERE unaccent(lower(service)) LIKE unaccent(lower(${pattern}))
             )
        `,
        this.prisma.$queryRaw<{ id: number }[]>`
          SELECT id FROM profession_categories
          WHERE unaccent(lower(name)) LIKE unaccent(lower(${pattern}))
        `,
      ]);

      const profileIds = profileRows.map((row) => row.id);
      const categoryIds = categoryRows.map((row) => row.id);

      where.AND = [
        {
          OR: [
            { id: { in: profileIds } },
            { professionCategories: { some: { id: { in: categoryIds } } } },
          ],
        },
      ];
    }

    return this.prisma.professionalProfile.findMany({
      where,
      include: {
        professionCategories: true,
        rubro: true,
        country: true,
        province: true,
      },
    });
  }
}
