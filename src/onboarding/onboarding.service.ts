import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProfessionalProfile, Category } from '@prisma/client';

type ProfileWithCategories = ProfessionalProfile & { categories: Category[] };

const CHECKLIST: Array<{
  key: string;
  label: string;
  check: (p: ProfileWithCategories) => boolean;
}> = [
  { key: 'photo',      label: 'Upload a profile photo',  check: (p) => Boolean(p.photo) },
  { key: 'bio',        label: 'Write your bio',           check: (p) => Boolean(p.bio) },
  { key: 'services',   label: 'Add your services',        check: (p) => p.services.length > 0 },
  { key: 'price',      label: 'Set your price range',     check: (p) => p.priceMin !== null },
  { key: 'contact',    label: 'Add contact info',         check: (p) => Boolean(p.whatsapp) || Boolean(p.emailContact) },
  { key: 'categories', label: 'Select your categories',   check: (p) => p.categories.length > 0 },
];

@Injectable()
export class OnboardingService {
  constructor(private readonly prisma: PrismaService) {}

  async getChecklist(userId: string) {
    const profile = await this.prisma.professionalProfile.findFirst({
      where: { userId },
      include: { categories: true },
    });

    if (!profile) {
      throw new NotFoundException('Professional profile not found');
    }

    return {
      profileStatus: profile.profileStatus,
      completionPct: profile.completionPct,
      items: CHECKLIST.map((item) => ({
        key: item.key,
        label: item.label,
        completed: item.check(profile),
      })),
    };
  }

  async completeOnboarding(userId: string) {
    const profile = await this.prisma.professionalProfile.findFirst({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException('Professional profile not found');
    }

    if (profile.completionPct < 60) {
      throw new BadRequestException(
        'Profile must be at least 60% complete to finish onboarding',
      );
    }

    const updatedProfile = await this.prisma.professionalProfile.update({
      where: { id: profile.id },
      data: { profileStatus: 'active' },
    });

    return updatedProfile;
  }
}
