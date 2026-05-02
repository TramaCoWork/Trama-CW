import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getMe(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    });
  }

  async getContacts(userId: string) {
    const profile = await this.prisma.professionalProfile.findFirst({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException('Professional profile not found');
    }

    return this.prisma.contactLog.findMany({
      where: { professionalId: profile.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getJobs(userId: string) {
    return this.prisma.job.findMany({
      where: { isActive: true },
      include: {
        applications: {
          where: { userId },
        },
      },
    });
  }
}
