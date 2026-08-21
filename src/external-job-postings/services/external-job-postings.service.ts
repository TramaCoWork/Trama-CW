import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { withoutDeleted } from '../../common/filters/soft-delete.filter';
import type { ListExternalJobPostingsDto } from '../dto/list-external-job-postings.dto';

const PUBLIC_SELECT = {
  id: true,
  source: true,
  externalId: true,
  title: true,
  link: true,
  categoryName: true,
  publishedAt: true,
  createdAt: true,
} satisfies Prisma.ExternalJobPostingSelect;

export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

@Injectable()
export class ExternalJobPostingsService {
  constructor(private readonly prisma: PrismaService) {}

  async listPostings(filters: ListExternalJobPostingsDto) {
    const { page, limit, source, categoryName, q } = filters;

    const where = this.buildWhere(source, categoryName, q);

    const [data, total] = await Promise.all([
      this.prisma.externalJobPosting.findMany({
        where,
        orderBy: { publishedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: PUBLIC_SELECT,
      }),
      this.prisma.externalJobPosting.count({ where }),
    ]);

    const pagination: PaginationMeta = {
      page,
      limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    };

    return { data, pagination };
  }

  private buildWhere(
    source?: string,
    categoryName?: string,
    q?: string,
  ): Prisma.ExternalJobPostingWhereInput {
    // Soft-deleted jobs excluded via withoutDeleted() helper
    const base = withoutDeleted();

    if (source) {
      base.source = source;
    }

    if (categoryName) {
      base.categoryName = {
        contains: categoryName,
        mode: 'insensitive',
      };
    }

    const searchTerm = q?.trim();
    if (searchTerm) {
      base.OR = [
        { title: { contains: searchTerm, mode: 'insensitive' } },
        { categoryName: { contains: searchTerm, mode: 'insensitive' } },
      ];
    }

    return base;
  }

  async getCategoryCounts(): Promise<Array<{ categoryName: string; count: number }>> {
    const results = await this.prisma.externalJobPosting.groupBy({
      by: ['categoryName'],
      // Soft-deleted jobs excluded via withoutDeleted() helper
      where: { ...withoutDeleted(), categoryName: { not: null } },
      // TODO(review): Prisma 7 CountOrderByAggregateInput has no _all field; ordered by categoryName count field instead
      _count: { categoryName: true },
      orderBy: [{ _count: { categoryName: 'desc' } }],
    });

    return results.map((r) => ({
      categoryName: r.categoryName as string,
      count: r._count.categoryName,
    }));
  }
}
