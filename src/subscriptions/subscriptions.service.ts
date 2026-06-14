import {
  Injectable,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { SubscriptionPlansService } from '../subscription-plans/subscription-plans.service';
import { MercadoPagoService } from '../mercadopago/mercadopago.service';
import { PaymentStrategyFactory } from './strategies/payment-strategy.factory';
import { MpBricksStrategy } from './strategies/mp-bricks.strategy';
import { MpBricksSubscriptionStrategy } from './strategies/mp-bricks-subscription.strategy';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { BricksPayDto } from './dto/bricks-pay.dto';
import { BricksSubscribeDto } from './dto/bricks-subscribe.dto';
import { SubscriptionStatus } from '@prisma/client';
import { WebhookPaymentData } from './strategies/payment-strategy.interface';
import { withoutDeleted } from '../common/filters/soft-delete.filter';

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly plansService: SubscriptionPlansService,
    private readonly strategyFactory: PaymentStrategyFactory,
    private readonly mercadopago: MercadoPagoService,
    private readonly bricksStrategy: MpBricksStrategy,
    private readonly bricksSubscriptionStrategy: MpBricksSubscriptionStrategy,
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

    // Resolver strategy (desde DTO o default)
    const strategy = this.strategyFactory.getStrategy(dto.paymentStrategy);

    // Obtener email del usuario autenticado
    const user = await this.prisma.user.findUnique({
      where: withoutDeleted({ id: userId }),
      select: { email: true },
    });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    // Crear registro en DB con el strategy code
    const subscription = await this.prisma.subscription.create({
      data: {
        userId,
        planId: plan.id,
        mpPayerEmail: user.email,
        status: 'pending',
        paymentStrategy: strategy.code,
      },
    });

    // Delegar creación del pago al strategy
    const notificationUrl = this.config.getOrThrow<string>('SUBSCRIPTION_NOTIFICATION_URL');
    const { initPoint, externalId } = await strategy.createPayment({
      subscriptionId: subscription.id,
      plan,
      payerEmail: user.email,
      backUrl: dto.backUrl,
      notificationUrl,
    });

    // Actualizar con externalId e initPoint
    await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: { externalId, initPoint },
    });

    return {
      id: subscription.id,
      planId: plan.id,
      status: 'pending',
      paymentStrategy: strategy.code,
      initPoint,
      createdAt: subscription.createdAt,
    };
  }

  // ─── Checkout Bricks ────────────────────────────────────────────────────────

  /** Config pública para inicializar Checkout Bricks en el front. */
  getBricksConfig() {
    return { publicKey: this.mercadopago.getPublicKey() };
  }

  /**
   * Procesa un pago con Checkout Bricks: recibe el token tokenizado por el front,
   * crea el pago en MP (resultado sincrónico) y activa la suscripción si se aprueba.
   * La confirmación por webhook es idempotente.
   */
  async payWithBricks(userId: string, dto: BricksPayDto) {
    // Bloquear solo si ya hay una suscripción vigente (no si quedó pending/cancelled)
    const active = await this.prisma.subscription.findFirst({
      where: { userId, status: { in: ['authorized', 'active'] } },
    });
    if (active) {
      throw new ConflictException('Ya tenés una suscripción activa');
    }

    const plan = await this.plansService.findOne(dto.planId);
    if (!plan.isActive) {
      throw new NotFoundException('Plan no encontrado o inactivo');
    }

    const user = await this.prisma.user.findUnique({
      where: withoutDeleted({ id: userId }),
      select: { email: true },
    });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const payerEmail = dto.payerEmail ?? user.email;

    // Reusar una suscripción pendiente (reintento o renovación del cron) o crear una nueva
    const pending = await this.prisma.subscription.findFirst({
      where: { userId, status: 'pending' },
    });

    const subscription = pending
      ? await this.prisma.subscription.update({
          where: { id: pending.id },
          data: { planId: plan.id, mpPayerEmail: payerEmail, paymentStrategy: 'mp_bricks' },
        })
      : await this.prisma.subscription.create({
          data: {
            userId,
            planId: plan.id,
            mpPayerEmail: payerEmail,
            status: 'pending',
            paymentStrategy: 'mp_bricks',
          },
        });

    const notificationUrl = this.config.getOrThrow<string>('SUBSCRIPTION_NOTIFICATION_URL');

    const result = await this.bricksStrategy.payWithToken({
      subscriptionId: subscription.id,
      plan,
      payerEmail,
      notificationUrl,
      token: dto.token,
      paymentMethodId: dto.paymentMethodId,
      paymentType: dto.paymentType,
      issuerId: dto.issuerId,
      installments: dto.installments,
      identification:
        dto.identificationType && dto.identificationNumber
          ? { type: dto.identificationType, number: dto.identificationNumber }
          : undefined,
    });

    // Guardar el id del pago de MP como externalId de la suscripción
    await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: { externalId: result.paymentId },
    });

    if (result.status === 'approved') {
      await this.activateFromCheckoutPayment(subscription.id, result.data);
      const updated = await this.prisma.subscription.findUnique({
        where: { id: subscription.id },
        select: { endDate: true },
      });
      return {
        subscriptionId: subscription.id,
        status: 'approved',
        paymentStatus: result.status,
        statusDetail: result.statusDetail,
        endDate: updated?.endDate,
        message: 'Pago aprobado. Tu suscripción está activa.',
      };
    }

    if (result.status === 'in_process' || result.status === 'pending') {
      // El pago quedó en revisión: la activación llegará por webhook.
      return {
        subscriptionId: subscription.id,
        status: 'pending',
        paymentStatus: result.status,
        statusDetail: result.statusDetail,
        message: 'Tu pago está en revisión. Te avisaremos cuando se acredite.',
      };
    }

    // Rechazado: registrar el intento y liberar la suscripción para reintento
    await this.registerPaymentBySubscriptionId(subscription.id, result.data);
    await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: 'cancelled', cancellationReason: result.statusDetail ?? 'payment_rejected' },
    });

    return {
      subscriptionId: subscription.id,
      status: 'rejected',
      paymentStatus: result.status,
      statusDetail: result.statusDetail,
      message: 'El pago fue rechazado. Probá con otro medio de pago.',
    };
  }

  /**
   * Crea una suscripción con cobro automático mensual usando Checkout Bricks on-site
   * (PreApproval con card_token_id). La frecuencia y el monto salen del plan.
   * MP cobra automáticamente cada período; los webhooks los maneja MpSubscriptionStrategy.
   */
  async subscribeWithBricks(userId: string, dto: BricksSubscribeDto) {
    const active = await this.prisma.subscription.findFirst({
      where: { userId, status: { in: ['authorized', 'active'] } },
    });
    if (active) {
      throw new ConflictException('Ya tenés una suscripción activa');
    }

    const plan = await this.plansService.findOne(dto.planId);
    if (!plan.isActive) {
      throw new NotFoundException('Plan no encontrado o inactivo');
    }

    const user = await this.prisma.user.findUnique({
      where: withoutDeleted({ id: userId }),
      select: { email: true },
    });
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const payerEmail = dto.payerEmail ?? user.email;
    const backUrl = dto.backUrl ?? this.config.get<string>('FRONTEND_URL', 'http://localhost:4321');

    // Reusar una suscripción pendiente o crear una nueva
    const pending = await this.prisma.subscription.findFirst({
      where: { userId, status: 'pending' },
    });

    const subscription = pending
      ? await this.prisma.subscription.update({
          where: { id: pending.id },
          data: { planId: plan.id, mpPayerEmail: payerEmail, paymentStrategy: 'mp_bricks_subscription' },
        })
      : await this.prisma.subscription.create({
          data: {
            userId,
            planId: plan.id,
            mpPayerEmail: payerEmail,
            status: 'pending',
            paymentStrategy: 'mp_bricks_subscription',
          },
        });

    const notificationUrl = this.config.getOrThrow<string>('SUBSCRIPTION_NOTIFICATION_URL');
    const result = await this.bricksSubscriptionStrategy.payWithCardToken({
      subscriptionId: subscription.id,
      plan, // ← frecuencia, monto y moneda salen del plan
      payerEmail,
      cardTokenId: dto.token,
      backUrl,
      notificationUrl,
    });

    const statusMap: Record<string, SubscriptionStatus> = {
      authorized: SubscriptionStatus.authorized,
      active: SubscriptionStatus.active,
      pending: SubscriptionStatus.pending,
      paused: SubscriptionStatus.paused,
      cancelled: SubscriptionStatus.cancelled,
    };
    const mappedStatus = statusMap[result.status] ?? SubscriptionStatus.pending;
    const isActive = mappedStatus === 'authorized' || mappedStatus === 'active';

    await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        externalId: result.externalId,
        status: mappedStatus,
        startDate: isActive ? new Date() : undefined,
        nextPaymentDate: result.nextPaymentDate ? new Date(result.nextPaymentDate) : undefined,
      },
    });

    // Activar perfil si la suscripción quedó autorizada/activa
    if (isActive) {
      await this.prisma.professionalProfile.updateMany({
        where: withoutDeleted({ userId }),
        data: { profileStatus: 'active', isActive: true, trialEndDate: null },
      });
    }

    return {
      subscriptionId: subscription.id,
      status: mappedStatus,
      preapprovalId: result.externalId,
      nextPaymentDate: result.nextPaymentDate,
      message: isActive
        ? 'Suscripción activa. El cobro se hará automáticamente según la frecuencia del plan.'
        : 'Suscripción creada, pendiente de confirmación.',
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
        status: { in: ['pending', 'authorized', 'active'] },
      },
    });
    if (!subscription) {
      throw new NotFoundException('No tenés una suscripción activa para cancelar');
    }

    // Resolver strategy desde la suscripción
    const strategy = this.strategyFactory.getStrategy(subscription.paymentStrategy);
    const { endDate } = await strategy.cancelSubscription(subscription.externalId, subscription.endDate);

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

    this.logger.log(`Subscription cancelled: ${subscription.id} (${strategy.code})${reason ? ` — reason: ${reason}` : ''}`);

    return { message: 'Suscripción cancelada. Tu perfil seguirá activo hasta el fin del período pagado.', paidUntil: endDate };
  }

  // --- Métodos usados por el webhook ---

  async updateStatus(externalId: string, status: SubscriptionStatus, startDate?: Date, externalReference?: string) {
    // Buscar por externalId (MP preapproval ID), con fallback a external_reference (nuestro subscription.id)
    let subscription = await this.prisma.subscription.findUnique({
      where: { externalId },
      include: { plan: true },
    });

    if (!subscription && externalReference) {
      subscription = await this.prisma.subscription.findUnique({
        where: { id: externalReference },
        include: { plan: true },
      });
      if (subscription) {
        this.logger.log(`Subscription found by external_reference: ${externalReference}`);
        if (!subscription.externalId) {
          await this.prisma.subscription.update({
            where: { id: subscription.id },
            data: { externalId },
          });
        }
      }
    }

    if (!subscription) {
      this.logger.warn(`Subscription not found for externalId: ${externalId} / external_reference: ${externalReference}`);
      return;
    }

    const data: any = { status };
    const computedTrialEnd = startDate && subscription.plan.trialDays > 0
      ? new Date(startDate.getTime() + subscription.plan.trialDays * 86400000)
      : undefined;

    if (startDate) {
      data.startDate = startDate;
    }

    await this.prisma.subscription.update({ where: { id: subscription.id }, data });

    if (computedTrialEnd) {
      await this.prisma.professionalProfile.updateMany({
        where: withoutDeleted({ userId: subscription.userId }),
        data: { trialEndDate: computedTrialEnd },
      });
    }

    this.logger.log(`Subscription ${subscription.id} status -> ${status}`);

    // Reactivar perfil profesional cuando la suscripción se activa
    if (status === 'active') {
      await this.prisma.professionalProfile.updateMany({
        where: withoutDeleted({ userId: subscription.userId }),
        data: {
          profileStatus: 'active',
          isActive: true,
          trialEndDate: null,
        },
      });
      this.logger.log(`Profile reactivated for user ${subscription.userId}`);
    }

    // Dar de baja el perfil cuando MP pausa/cancela el preapproval (e.g. tras fallar el cobro mensual)
    if (status === 'paused' || status === 'cancelled' || status === 'expired') {
      await this.prisma.professionalProfile.updateMany({
        where: withoutDeleted({ userId: subscription.userId }),
        data: {
          profileStatus: 'waiting_payment',
          isActive: false,
        },
      });
      this.logger.warn(
        `Profile deactivated for user ${subscription.userId} (subscription ${status})`,
      );
    }
  }

  async activateFromCheckoutPayment(subscriptionId: string, data: WebhookPaymentData) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
      include: { plan: true },
    });
    if (!subscription) {
      this.logger.warn(`Subscription not found for checkout payment: ${subscriptionId}`);
      return;
    }

    // Registrar pago
    await this.registerPaymentBySubscriptionId(subscriptionId, data);

    // Calcular endDate según frecuencia del plan
    const now = new Date();
    const endDate = new Date(now);
    if (subscription.plan.frequencyType === 'months') {
      endDate.setMonth(endDate.getMonth() + subscription.plan.frequency);
    } else {
      endDate.setDate(endDate.getDate() + subscription.plan.frequency);
    }

    // Activar suscripción
    await this.prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        status: 'active',
        startDate: subscription.startDate ?? now,
        endDate,
      },
    });

    // Activar perfil profesional
    await this.prisma.professionalProfile.updateMany({
      where: withoutDeleted({ userId: subscription.userId }),
      data: {
        profileStatus: 'active',
        isActive: true,
        trialEndDate: null,
      },
    });

    this.logger.log(`Checkout payment approved: subscription ${subscriptionId} active until ${endDate.toISOString()}`);
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

    return this._createPaymentRecord(subscription.id, data);
  }

  async registerPaymentBySubscriptionId(subscriptionId: string, data: WebhookPaymentData) {
    // Idempotencia
    const existing = await this.prisma.subscriptionPayment.findUnique({
      where: { externalId: data.paymentExternalId },
    });
    if (existing) {
      this.logger.log(`Payment already registered: ${data.paymentExternalId}`);
      return existing;
    }

    return this._createPaymentRecord(subscriptionId, data);
  }

  private async _createPaymentRecord(subscriptionId: string, data: WebhookPaymentData) {
    const attemptCount = await this.prisma.subscriptionPayment.count({
      where: { subscriptionId },
    });

    const payment = await this.prisma.subscriptionPayment.create({
      data: {
        subscriptionId,
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
