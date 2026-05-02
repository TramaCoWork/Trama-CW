import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateJobDto } from './dto/create-job.dto';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getPendingProfessionals() {
    return this.prisma.professionalProfile.findMany({
      where: {
        OR: [
          { isActive: false },
          { profileStatus: { in: ['incomplete', 'onboarding'] } },
        ],
      },
      include: {
        user: { select: { id: true, email: true } },
      },
    });
  }

  async approveProfessional(id: string) {
    const profile = await this.prisma.professionalProfile.findUnique({
      where: { id },
    });

    if (!profile) {
      throw new NotFoundException('Professional profile not found');
    }

    return this.prisma.professionalProfile.update({
      where: { id },
      data: {
        isActive: true,
        profileStatus: 'active',
      },
    });
  }

  async createJob(dto: CreateJobDto) {
    return this.prisma.job.create({
      data: {
        title: dto.title,
        description: dto.description,
        createdByAdmin: true,
        isActive: true,
      },
    });
  }

  async getPayments() {
    return this.prisma.payment.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, email: true } },
      },
    });
  }
}
