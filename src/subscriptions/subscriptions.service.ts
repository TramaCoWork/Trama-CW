import {
  Injectable,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { MercadoPagoService } from '../mercadopago/mercadopago.service';
import { SubscriptionPlansService } from '../subscription-plans/subscription-plans.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { SubscriptionStatus } from '@prisma/client';

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly mercadopago: MercadoPagoService,
    private readonly plansService: SubscriptionPlansService,
  ) {}

  async create(userId: string, dto: CreateSubscriptionDto) {
    // Validar que no tenga suscripción activa
    const existing = await this.prisma.subscription.findFirst({
      where: {
        userId,
        status: { in: ['pending', 'authorized', 'active'] },
      },
    });
    if (existing) {
      throw new ConflictException('Ya tenés una suscripción activa');
    }

    // Validar plan activo
    const plan = await this.plansService.findOne(dto.planId);
    if (!plan.isActive) {
      throw new NotFoundException('Plan no encontrado o inactivo');
    }

    // Crear registro en DB
    const subscription = await this.prisma.subscription.create({
      data: {
        userId,
        planId: plan.id,
        mpPayerEmail: dto.payerEmail,
        status: 'pending',
      },
    });

    // Crear preapproval en MercadoPago
    const notificationUrl = this.config.getOrThrow<string>('SUBSCRIPTION_NOTIFICATION_URL');

    const mpResult = await this.mercadopago.createPreapproval({
      reason: plan.name,
      amount: Number(plan.amount),
      currencyId: plan.currency,
      frequency: plan.frequency,
      frequencyType: plan.frequencyType as 'days' | 'months',
      trialDays: plan.trialDays,
      payerEmail: dto.payerEmail,
      backUrl: dto.backUrl,
      notificationUrl,
    });

    // Actualizar con externalId e initPoint
    await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        externalId: mpResult.id?.toString(),
        initPoint: mpResult.init_point,
      },
    });

    this.logger.log(`Subscription created: ${subscription.id} -> MP: ${mpResult.id}`);

    return {
      id: subscription.id,
      planId: plan.id,
      status: 'pending',
      initPoint: mpResult.init_point,
      createdAt: subscription.createdAt,
    };
  }

  async findMySubscription(userId: string) {
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        userId,
        status: { in: ['pending', 'authorized', 'active'] },
      },
      include: {
        plan: true,
        payments: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!subscription) {
      throw new NotFoundException('No tenés una suscripción activa');
    }
    return subscription;
  }

  async cancel(userId: string, reason?: string) {
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        userId,
        status: { in: ['authorized', 'active'] },
      },
    });
    if (!subscription) {
      throw new NotFoundException('No tenés una suscripción activa para cancelar');
    }

    // Cancelar en MP y obtener next_payment_date
    let endDate = new Date(); // fallback: expiración inmediata en el próximo cron
    if (subscription.externalId) {
      await this.mercadopago.cancelPreapproval(subscription.externalId);

      try {
        const preapproval = await this.mercadopago.getPreapproval(subscription.externalId);
        const nextPayment = (preapproval as any).next_payment_date;
        if (nextPayment) {
          endDate = new Date(nextPayment);
          this.logger.log(`Subscription ${subscription.id} paid until: ${endDate.toISOString()}`);
        }
      } catch (error) {
        this.logger.warn(`Could not fetch preapproval details for endDate: ${error.message}`);
      }
    }

    // Actualizar DB — NO tocar el perfil profesional
    // El cron se encarga de desactivar cuando endDate expire
    await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: 'cancelled',
        endDate,
        cancellationReason: reason ?? null,
      },
    });

    this.logger.log(`Subscription cancelled: ${subscription.id}${reason ? ` — reason: ${reason}` : ''}`);

    return { message: 'Suscripción cancelada. Tu perfil seguirá activo hasta el fin del período pagado.', paidUntil: endDate };
  }

  // --- Métodos usados por el webhook ---

  async updateStatus(externalId: string, status: SubscriptionStatus, startDate?: Date) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { externalId },
      include: { plan: true },
    });
    if (!subscription) {
      this.logger.warn(`Subscription not found for externalId: ${externalId}`);
      return;
    }

    const data: any = { status };
    if (startDate) {
      data.startDate = startDate;
      if (subscription.plan.trialDays > 0) {
        data.trialEndDate = new Date(startDate.getTime() + subscription.plan.trialDays * 86400000);
      }
    }

    await this.prisma.subscription.update({ where: { id: subscription.id }, data });
    this.logger.log(`Subscription ${subscription.id} status -> ${status}`);

    // Reactivar perfil profesional cuando la suscripción se activa
    if (status === 'active') {
      await this.prisma.professionalProfile.updateMany({
        where: { userId: subscription.userId },
        data: {
          profileStatus: 'active',
          isActive: true,
          trialEndDate: null,
        },
      });
      this.logger.log(`Profile reactivated for user ${subscription.userId}`);
    }
  }

  async registerPayment(data: {
    subscriptionExternalId: string;
    paymentExternalId: string;
    amount: number;
    status: 'sub_approved' | 'sub_rejected';
    failureReason?: string;
    paymentMethod?: string | null;
    paymentMethodId?: string | null;
    cardLastFourDigits?: string | null;
    installments?: number | null;
    statusDetail?: string | null;
    metadata?: any;
  }) {
    // Idempotencia
    const existing = await this.prisma.subscriptionPayment.findUnique({
      where: { externalId: data.paymentExternalId },
    });
    if (existing) {
      this.logger.log(`Payment already registered: ${data.paymentExternalId}`);
      return existing;
    }

    const subscription = await this.prisma.subscription.findUnique({
      where: { externalId: data.subscriptionExternalId },
    });
    if (!subscription) {
      this.logger.warn(`Subscription not found for payment: ${data.subscriptionExternalId}`);
      return;
    }

    // Count attempts for this subscription
    const attemptCount = await this.prisma.subscriptionPayment.count({
      where: { subscriptionId: subscription.id },
    });

    const payment = await this.prisma.subscriptionPayment.create({
      data: {
        subscriptionId: subscription.id,
        externalId: data.paymentExternalId,
        amount: data.amount,
        status: data.status,
        attemptNumber: attemptCount + 1,
        paidAt: data.status === 'sub_approved' ? new Date() : undefined,
        failedAt: data.status === 'sub_rejected' ? new Date() : undefined,
        failureReason: data.failureReason,
        paymentMethod: data.paymentMethod ?? undefined,
        paymentMethodId: data.paymentMethodId ?? undefined,
        cardLastFourDigits: data.cardLastFourDigits ?? undefined,
        installments: data.installments ?? undefined,
        statusDetail: data.statusDetail ?? undefined,
        metadata: data.metadata ?? undefined,
      },
    });

    this.logger.log(`Payment registered: ${payment.id} (${data.status})`);
    return payment;
  }

  async findMyPayments(userId: string, page = 1, sizePage = 10) {
    // Buscar todas las suscripciones del usuario (no solo activas)
    const subscriptionIds = await this.prisma.subscription.findMany({
      where: { userId },
      select: { id: true },
    });

    if (!subscriptionIds.length) {
      return { data: [], total: 0, page, sizePage };
    }

    const ids = subscriptionIds.map((s) => s.id);

    const where = { subscriptionId: { in: ids } };

    const [data, total] = await Promise.all([
      this.prisma.subscriptionPayment.findMany({
        where,
        include: {
          subscription: {
            select: { externalId: true, plan: { select: { name: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * sizePage,
        take: sizePage,
      }),
      this.prisma.subscriptionPayment.count({ where }),
    ]);

    return { data, total, page, sizePage };
  }
}
