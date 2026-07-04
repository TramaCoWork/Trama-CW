import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { JobStatus, Prisma } from '@prisma/client';
import { PaginationDto } from '../common/dto/pagination.dto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateJobDto } from '../jobs/dto/create-job.dto';
import { UpdateJobDto } from '../jobs/dto/update-job.dto';

type AdminJobStatusFilter = JobStatus.active | JobStatus.paused;

@Injectable()
export class AdminJobsService {
  constructor(private readonly prisma: PrismaService) {}

  async createJob(dto: CreateJobDto) {
    return this.prisma.job.create({
      data: this.mapCreateData(dto),
    });
  }

  async listJobs(
    pagination: PaginationDto,
    status?: AdminJobStatusFilter,
    categoryId?: number,
  ) {
    const { page, limit } = pagination;

    if (status && status !== JobStatus.active && status !== JobStatus.paused) {
      throw new BadRequestException('status debe ser active o paused');
    }

    const where: Prisma.JobWhereInput = {
      deletedAt: null,
      ...(status ? { status } : {}),
      ...(categoryId !== undefined ? { categoryIds: { has: categoryId } } : {}),
    };

    const [data, total] = await Promise.all([
      this.prisma.job.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          _count: { select: { applications: true } },
        },
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

  async getJobById(id: string) {
    const job = await this.prisma.job.findFirst({
      where: {
        id,
        deletedAt: null,
      },
    });

    if (!job) {
      throw new NotFoundException('Trabajo no encontrado');
    }

    return job;
  }

  async updateJob(id: string, dto: UpdateJobDto) {
    await this.ensureJobExists(id);

    return this.prisma.job.update({
      where: { id },
      data: this.mapUpdateData(dto),
    });
  }

  async updateJobStatus(id: string, status: AdminJobStatusFilter) {
    if (status !== JobStatus.active && status !== JobStatus.paused) {
      throw new BadRequestException('status debe ser active o paused');
    }

    await this.ensureJobExists(id);

    return this.prisma.job.update({
      where: { id },
      data: { status },
    });
  }

  async softDeleteJob(id: string) {
    await this.ensureJobExists(id);

    await this.prisma.job.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return { message: 'Trabajo eliminado logicamente' };
  }

  async listJobApplications(id: string, pagination: PaginationDto) {
    await this.ensureJobExists(id);

    const { page, limit } = pagination;
    const where: Prisma.JobApplicationWhereInput = { jobId: id };

    const [data, total] = await Promise.all([
      this.prisma.jobApplication.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
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

  private mapCreateData(dto: CreateJobDto): Prisma.JobCreateInput {
    return {
      title: dto.title,
      description: dto.description,
      email: dto.email,
      status: dto.status,
      validFrom: dto.validFrom ? new Date(dto.validFrom) : undefined,
      validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
      companyName: dto.companyName,
      companyLogo: dto.companyLogo,
      categoryIds: dto.categoryIds ?? [],
    };
  }

  private mapUpdateData(dto: UpdateJobDto): Prisma.JobUpdateInput {
    return {
      title: dto.title,
      description: dto.description,
      email: dto.email,
      status: dto.status,
      validFrom: dto.validFrom ? new Date(dto.validFrom) : undefined,
      validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
      companyName: dto.companyName,
      companyLogo: dto.companyLogo,
      categoryIds: dto.categoryIds,
    };
  }

  private async ensureJobExists(id: string) {
    const job = await this.prisma.job.findFirst({
      where: { id, deletedAt: null },
      select: { id: true },
    });

    if (!job) {
      throw new NotFoundException('Trabajo no encontrado');
    }
  }
}
