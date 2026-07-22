import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterPushSubscriptionDto } from './dto/register-push-subscription.dto';

const DEFAULT_PROVIDER = 'onesignal';

@Injectable()
export class PushService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Registra (o actualiza) la suscripcion de push del usuario autenticado.
   * Idempotente por (provider, subscriptionId): si ese UUID ya existia, se
   * reasigna al usuario actual (ej. mismo dispositivo con otro login).
   */
  async registerSubscription(
    userId: string,
    dto: RegisterPushSubscriptionDto,
  ) {
    const provider = dto.provider ?? DEFAULT_PROVIDER;

    return this.prisma.pushSubscription.upsert({
      where: {
        provider_subscriptionId: {
          provider,
          subscriptionId: dto.subscriptionId,
        },
      },
      update: { userId },
      create: {
        userId,
        provider,
        subscriptionId: dto.subscriptionId,
      },
    });
  }

  /**
   * Elimina la suscripcion de push del usuario autenticado (ej. logout).
   * Idempotente y scopeado al userId: solo borra suscripciones propias.
   */
  async deleteSubscription(
    userId: string,
    subscriptionId: string,
    provider?: string,
  ) {
    const { count } = await this.prisma.pushSubscription.deleteMany({
      where: {
        userId,
        subscriptionId,
        provider: provider ?? DEFAULT_PROVIDER,
      },
    });

    return { ok: true, deleted: count };
  }
}
