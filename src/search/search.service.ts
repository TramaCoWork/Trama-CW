import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProfessionalProfile, Prisma } from '@prisma/client';

export interface SearchQuery {
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
      user: { emailVerified: true },
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

    return this.prisma.professionalProfile.findMany({
      where,
      include: { professionCategories: true, rubro: true, country: true, province: true },
    });
  }

}
