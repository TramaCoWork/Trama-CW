import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProfessionalProfile, ProfessionCategory } from '@prisma/client';
import { withoutDeleted } from '../common/filters/soft-delete.filter';

type ProfileWithRelations = ProfessionalProfile & {
  professionCategories: ProfessionCategory[];
  educations: any[];
  certifications: any[];
  documents: any[];
};

const CHECKLIST: Array<{
  key: string;
  section: number;
  label: string;
  check: (p: ProfileWithRelations) => boolean;
}> = [
  {
    key: 'personal',
    section: 1,
    label: 'Datos personales (nombre, DNI, ciudad)',
    check: (p) => Boolean(p.name) && Boolean(p.dni) && Boolean(p.city),
  },
  {
    key: 'dni_document',
    section: 1,
    label: 'Subir DNI / Pasaporte',
    check: (p) => p.documents.some((d) => d.type === 'dni'),
  },
  {
    key: 'professional',
    section: 2,
    label: 'Perfil profesional (rubro, profesiones, bio)',
    check: (p) => Boolean(p.rubroId) && Boolean(p.bio),
  },
  {
    key: 'education',
    section: 3,
    label: 'Formacion academica',
    check: (p) => p.educations.length > 0,
  },
  {
    key: 'certifications',
    section: 4,
    label: 'Cursos y certificaciones',
    check: () => true,
  }, // Opcional
  {
    key: 'cv',
    section: 5,
    label: 'Subir CV (PDF)',
    check: (p) => p.documents.some((d) => d.type === 'cv'),
  },
  {
    key: 'interests',
    section: 6,
    label: 'Intereses dentro de Trama',
    check: (p) => p.interestsInTrama.length > 0,
  },
  {
    key: 'usage',
    section: 7,
    label: 'Modalidad de uso',
    check: (p) => p.usageFrequency !== null,
  },
  {
    key: 'motivation',
    section: 8,
    label: 'Pregunta filtro (por que Trama)',
    check: () => true,
  },
  {
    key: 'consent',
    section: 9,
    label: 'Consentimiento y envio',
    check: (p) => p.termsAccepted && p.dataConsentAccepted,
  },
];

@Injectable()
export class OnboardingService {
  constructor(private readonly prisma: PrismaService) {}

  async getChecklist(userId: string) {
    const profile = await this.prisma.professionalProfile.findFirst({
      where: withoutDeleted({ userId }),
      include: {
        professionCategories: true,
        educations: true,
        certifications: true,
        documents: true,
      },
    });

    if (!profile) {
      throw new NotFoundException('Professional profile not found');
    }

    const items = CHECKLIST.map((item) => ({
      key: item.key,
      section: item.section,
      label: item.label,
      completed: item.check(profile as ProfileWithRelations),
    }));

    const requiredItems = items.filter((i) => i.key !== 'certifications');
    const completedCount = requiredItems.filter((i) => i.completed).length;
    const completionPct = Math.round(
      (completedCount / requiredItems.length) * 100,
    );

    return {
      profileStatus: profile.profileStatus,
      completionPct,
      currentStep: profile.currentStep,
      isFirstTime: profile.isFirstTime,
      items,
    };
  }

  async completeOnboarding(userId: string) {
    const profile = await this.prisma.professionalProfile.findFirst({
      where: withoutDeleted({ userId }),
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
      where: withoutDeleted({ id: profile.id }),
      data: { profileStatus: 'active' },
    });

    return updatedProfile;
  }
}
