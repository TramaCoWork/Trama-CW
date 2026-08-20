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
    const { page, limit, source, categoryName } = filters;

    const where = this.buildWhere(source, categoryName);

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
  ): Prisma.ExternalJobPostingWhereInput {
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

    return base;
  }
}
