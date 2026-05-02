import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ApplyJobDto } from './dto/apply-job.dto';

@Injectable()
export class JobsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.job.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { applications: true } },
      },
    });
  }

  async apply(userId: string, dto: ApplyJobDto) {
    const job = await this.prisma.job.findUnique({
      where: { id: dto.jobId },
    });

    if (!job || !job.isActive) {
      throw new NotFoundException('Job not found');
    }

    const existing = await this.prisma.jobApplication.findUnique({
      where: { jobId_userId: { jobId: dto.jobId, userId } },
    });

    if (existing) {
      throw new ConflictException('Already applied to this job');
    }

    return this.prisma.jobApplication.create({
      data: {
        jobId: dto.jobId,
        userId,
        coverLetter: dto.coverLetter,
      },
    });
  }
}
