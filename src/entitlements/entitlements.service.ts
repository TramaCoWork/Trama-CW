import { Injectable } from '@nestjs/common';
import { SubscriptionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { withoutDeleted } from '../common/filters/soft-delete.filter';

export type PlanTier = 'free' | 'paid';

/**
 * Fuente unica de verdad del "plan" del profesional. NO es un plan con ID:
 * el tier se DERIVA del estado existente.
 *
 * - isPaid     = suscripcion activa (o trial vigente; hoy TRIAL_DAYS=0).
 * - isValidated= el admin aprobo la documentacion (profileStatus 'active').
 *   La validacion es un proceso separado del pago.
 */
@Injectable()
export class EntitlementsService {
  constructor(private readonly prisma: PrismaService) {}

  async isPaid(userId: string): Promise<boolean> {
    const profile = await this.prisma.professionalProfile.findFirst({
      where: withoutDeleted({ userId }),
      select: { trialEndDate: true },
    });

    if (profile?.trialEndDate && profile.trialEndDate >= new Date()) {
      return true;
    }

    const activeSubscriptions = await this.prisma.subscription.count({
      where: { userId, status: SubscriptionStatus.active },
    });

    return activeSubscriptions > 0;
  }

  async getTier(userId: string): Promise<PlanTier> {
    return (await this.isPaid(userId)) ? 'paid' : 'free';
  }

  async isValidated(userId: string): Promise<boolean> {
    const profile = await this.prisma.professionalProfile.findFirst({
      where: withoutDeleted({ userId }),
      select: { validatedAt: true },
    });

    return Boolean(profile?.validatedAt);
  }
}
