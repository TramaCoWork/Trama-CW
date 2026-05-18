import { Injectable, NotFoundException } from '@nestjs/common';
import { SubscriptionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ProfessionalDashboardDto } from './dto/professional-dashboard.dto';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfessionalDashboard(userId: string): Promise<ProfessionalDashboardDto> {
    const profile = await this.prisma.professionalProfile.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (!profile) {
      throw new NotFoundException('Professional profile not found');
    }

    const [
      totalContacts,
      totalEducations,
      totalCertifications,
      totalDocuments,
      totalMessages,
      totalCommunityPosts,
      totalJobApplications,
      totalValidations,
      activeSubscription,
    ] = await Promise.all([
      this.prisma.contactLog.count({ where: { professionalId: profile.id } }),
      this.prisma.education.count({ where: { professionalId: profile.id } }),
      this.prisma.certification.count({ where: { professionalId: profile.id } }),
      this.prisma.document.count({ where: { professionalId: profile.id } }),
      this.prisma.privateMessage.count({
        where: {
          OR: [{ senderId: userId }, { receiverId: userId }],
        },
      }),
      this.prisma.communityPost.count({ where: { userId } }),
      this.prisma.jobApplication.count({ where: { userId } }),
      this.prisma.profileValidation.count({ where: { professionalId: profile.id } }),
      this.prisma.subscription.findFirst({
        where: {
          userId,
          status: {
            in: [
              SubscriptionStatus.pending,
              SubscriptionStatus.authorized,
              SubscriptionStatus.active,
            ],
          },
        },
        select: {
          endDate: true,
          trialEndDate: true,
          plan: {
            select: {
              name: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    const trialEndDate = activeSubscription?.trialEndDate ?? null;

    return {
      totalContacts,
      totalEducations,
      totalCertifications,
      totalDocuments,
      totalMessages,
      totalCommunityPosts,
      totalJobApplications,
      totalValidations,
      planName: activeSubscription?.plan.name ?? null,
      planExpirationDate: activeSubscription?.endDate ?? null,
      trialEndDate,
      isOnTrial: Boolean(trialEndDate && trialEndDate > new Date()),
    };
  }

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
