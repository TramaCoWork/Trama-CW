import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProfessionalProfile, Prisma } from '@prisma/client';

export interface SearchQuery {
  category?: string;
  city?: string;
  price_min?: string;
  price_max?: string;
  profession?: string;
  modality?: string;
  industry?: string;
  years_min?: string;
  years_max?: string;
  profession_category?: string;
}

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(query: SearchQuery): Promise<ProfessionalProfile[]> {
    const where: Prisma.ProfessionalProfileWhereInput = {
      isActive: true,
    };

    if (query.city) {
      where.city = { contains: query.city, mode: 'insensitive' };
    }

    if (query.category) {
      where.categories = { some: { slug: query.category } };
    }

    if (query.price_min !== undefined) {
      where.priceMin = { gte: new Prisma.Decimal(query.price_min) };
    }

    if (query.price_max !== undefined) {
      where.priceMax = { lte: new Prisma.Decimal(query.price_max) };
    }

    if (query.profession) {
      where.mainProfession = { contains: query.profession, mode: 'insensitive' };
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

    return this.prisma.professionalProfile.findMany({
      where,
      include: { categories: true, professionCategories: true },
    });
  }
}
