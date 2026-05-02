import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProfessionalProfile, Prisma } from '@prisma/client';

export interface SearchQuery {
  category?: string;
  city?: string;
  price_min?: string;
  price_max?: string;
}

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async search(query: SearchQuery): Promise<ProfessionalProfile[]> {
    const where: Prisma.ProfessionalProfileWhereInput = {
      isActive: true,
    };

    if (query.city) {
      where.city = {
        contains: query.city,
        mode: 'insensitive',
      };
    }

    if (query.category) {
      where.categories = {
        some: {
          slug: query.category,
        },
      };
    }

    if (query.price_min !== undefined) {
      where.priceMin = {
        gte: new Prisma.Decimal(query.price_min),
      };
    }

    if (query.price_max !== undefined) {
      where.priceMax = {
        lte: new Prisma.Decimal(query.price_max),
      };
    }

    return this.prisma.professionalProfile.findMany({ where });
  }
}
