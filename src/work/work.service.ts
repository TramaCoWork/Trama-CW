import {
  ForbiddenException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { JobStatus, Prisma } from '@prisma/client';
import { verify } from 'jsonwebtoken';
import { PaginationDto } from '../common/dto/pagination.dto';
import { PrismaService } from '../prisma/prisma.service';
import { ApplyWorkDto } from './dto/apply-work.dto';

@Injectable()
export class WorkService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly publicSelect = {
    id: true,
    title: true,
    description: true,
    email: true,
    status: true,
    validFrom: true,
    validUntil: true,
    clickCount: true,
    companyName: true,
    companyLogo: true,
    categoryIds: true,
    createdAt: true,
    updatedAt: true,
    deletedAt: true,
  } satisfies Prisma.JobSelect;

  async listPublicJobs(
    pagination: PaginationDto,
    categoryIds: number[] = [],
    authorization?: string,
  ) {
    const { page, limit } = pagination;
    const now = new Date();
    const professionalCategoryIds = await this.getProfessionalRootCategoryIds(
      authorization,
    );
    const resolvedCategoryIds =
      categoryIds.length > 0 ? categoryIds : professionalCategoryIds;
    const where = this.buildPublicWhere(now, resolvedCategoryIds);

    const [data, total] = await Promise.all([
      this.prisma.job.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: this.publicSelect,
      }),
      this.prisma.job.count({ where }),
    ]);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
      },
    };
  }

  async getPublicJobById(id: string, userId?: string) {
    await this.ensureJobAvailable(id);

    const job = await this.prisma.job.update({
      where: { id },
      data: { clickCount: { increment: 1 } },
      select: this.publicSelect,
    });

    let hasApplied = false;
    if (userId) {
      const application = await this.prisma.jobApplication.findUnique({
        where: {
          jobId_userId: {
            jobId: id,
            userId,
          },
        },
        select: { id: true },
      });
      hasApplied = !!application;
    }

    return { ...job, hasApplied };
  }

  async apply(userId: string, jobId: string, dto: ApplyWorkDto) {
    await this.ensureJobAvailable(jobId);

    const existing = await this.prisma.jobApplication.findUnique({
      where: {
        jobId_userId: {
          jobId,
          userId,
        },
      },
    });

    if (existing) {
      throw new ConflictException('Ya aplicaste a este trabajo');
    }

    return this.prisma.jobApplication.create({
      data: {
        jobId,
        userId,
        coverLetter: dto.coverLetter,
      },
    });
  }

  async listMyApplications(userId: string, pagination: PaginationDto) {
    const { page, limit } = pagination;
    const where: Prisma.JobApplicationWhereInput = { userId };

    const [data, total] = await Promise.all([
      this.prisma.jobApplication.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          job: {
            select: this.publicSelect,
          },
        },
      }),
      this.prisma.jobApplication.count({ where }),
    ]);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
      },
    };
  }

  private buildPublicWhere(
    now: Date,
    categoryIds: number[] = [],
  ): Prisma.JobWhereInput {
    return {
      deletedAt: null,
      status: JobStatus.active,
      AND: [
        {
          OR: [{ validFrom: null }, { validFrom: { lte: now } }],
        },
        {
          OR: [{ validUntil: null }, { validUntil: { gte: now } }],
        },
      ],
      ...(categoryIds.length > 0
        ? { categoryIds: { hasSome: categoryIds } }
        : {}),
    };
  }

  private async ensureJobAvailable(id: string) {
    const job = await this.prisma.job.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        deletedAt: true,
        validFrom: true,
        validUntil: true,
      },
    });

    if (!job) {
      throw new NotFoundException('Trabajo no encontrado');
    }

    const now = new Date();
    const isValidFrom = job.validFrom === null || job.validFrom <= now;
    const isValidUntil = job.validUntil === null || job.validUntil >= now;

    if (
      job.deletedAt !== null ||
      job.status !== JobStatus.active ||
      !isValidFrom ||
      !isValidUntil
    ) {
      throw new ForbiddenException('Trabajo no disponible');
    }
  }

  private async getProfessionalRootCategoryIds(authorization?: string) {
    const userId = this.extractUserIdFromAuthorization(authorization);

    if (!userId) {
      return [];
    }

    const profile = await this.prisma.professionalProfile.findUnique({
      where: { userId },
      include: {
        professionCategories: {
          where: { parentId: null },
          select: { id: true },
        },
      },
    });

    if (!profile) {
      return [];
    }

    return profile.professionCategories.map((category) => category.id);
  }

  private extractUserIdFromAuthorization(authorization?: string) {
    if (!authorization?.startsWith('Bearer ')) {
      return undefined;
    }

    const token = authorization.slice(7).trim();

    if (!token) {
      return undefined;
    }

    try {
      const payload = verify(token, process.env.JWT_SECRET ?? 'default_secret') as {
        sub?: unknown;
        roles?: { name?: string; type?: string }[];
      };

      const roles = Array.isArray(payload.roles) ? payload.roles : [];
      const isProfessional = roles.some(
        (role) => role?.type === 'professional' || role?.name === 'professional',
      );

      if (!isProfessional || typeof payload.sub !== 'string') {
        return undefined;
      }

      return payload.sub;
    } catch {
      return undefined;
    }
  }
}
