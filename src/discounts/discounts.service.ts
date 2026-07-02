import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MercadoPagoService } from '../mercadopago/mercadopago.service';
import { CreateDiscountDto } from './dto/create-discount.dto';
import { withoutDeleted } from '../common/filters/soft-delete.filter';

@Injectable()
export class DiscountsService {
  private readonly logger = new Logger(DiscountsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mercadopago: MercadoPagoService,
  ) {}

  async create(adminUserId: string, dto: CreateDiscountDto) {
    if (!dto.percentage && !dto.fixedAmount) {
      throw new BadRequestException('Debe indicar percentage o fixedAmount');
    }

    const startDate = new Date(dto.startDate);
    const endDate = new Date(dto.endDate);

    if (endDate <= startDate) {
      throw new BadRequestException('endDate debe ser posterior a startDate');
    }

    // Verificar que el profesional existe
    const profile = await this.prisma.professionalProfile.findUnique({
      where: withoutDeleted({ id: dto.professionalId }),
    });
    if (!profile) {
      throw new NotFoundException('Perfil profesional no encontrado');
    }

    // Verificar que no haya un descuento activo solapado
    const overlapping = await this.prisma.discount.findFirst({
      where: {
        professionalId: dto.professionalId,
        restored: false,
        OR: [{ startDate: { lte: endDate }, endDate: { gte: startDate } }],
      },
    });
    if (overlapping) {
      throw new BadRequestException(
        'Ya existe un descuento activo en ese período para este profesional',
      );
    }

    return this.prisma.discount.create({
      data: {
        professionalId: dto.professionalId,
        percentage:
          dto.percentage != null ? new Prisma.Decimal(dto.percentage) : null,
        fixedAmount:
          dto.fixedAmount != null ? new Prisma.Decimal(dto.fixedAmount) : null,
        startDate,
        endDate,
        createdBy: adminUserId,
        notes: dto.notes,
      },
      include: { professional: { select: { id: true, name: true } } },
    });
  }

  async findAll(filters?: { professionalId?: string; active?: boolean }) {
    const where: Prisma.DiscountWhereInput = {};

    if (filters?.professionalId) {
      where.professionalId = filters.professionalId;
    }

    if (filters?.active === true) {
      where.restored = false;
      where.endDate = { gte: new Date() };
    }

    return this.prisma.discount.findMany({
      where,
      include: {
        professional: { select: { id: true, name: true } },
        creator: { select: { id: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const discount = await this.prisma.discount.findUnique({
      where: { id },
      include: {
        professional: { select: { id: true, name: true } },
        creator: { select: { id: true, email: true } },
      },
    });
    if (!discount) {
      throw new NotFoundException('Descuento no encontrado');
    }
    return discount;
  }

  async remove(id: string) {
    const discount = await this.findOne(id);
    if (discount.applied) {
      throw new BadRequestException(
        'No se puede eliminar un descuento ya aplicado. Espere a que se restaure automáticamente.',
      );
    }
    await this.prisma.discount.delete({ where: { id } });
    return { message: 'Descuento eliminado' };
  }

  // ─── Llamados por el cron ──────────────────────────────────────────────────

  async applyPendingDiscounts() {
    const now = new Date();

    const discounts = await this.prisma.discount.findMany({
      where: {
        applied: false,
        startDate: { lte: now },
        endDate: { gte: now },
      },
      include: {
        professional: {
          select: {
            id: true,
            userId: true,
          },
        },
      },
    });

    for (const discount of discounts) {
      try {
        // Buscar suscripción activa del profesional
        const subscription = await this.prisma.subscription.findFirst({
          where: {
            userId: discount.professional.userId,
            status: { in: ['active', 'authorized'] },
          },
          include: { plan: true },
        });

        if (!subscription?.externalId) {
          this.logger.warn(
            `No active subscription for professional ${discount.professionalId}, skipping discount ${discount.id}`,
          );
          continue;
        }

        // Calcular monto con descuento
        const originalAmount = Number(subscription.plan.amount);
        let discountedAmount: number;

        if (discount.percentage) {
          discountedAmount =
            originalAmount * (1 - Number(discount.percentage) / 100);
        } else if (discount.fixedAmount) {
          discountedAmount = originalAmount - Number(discount.fixedAmount);
        } else {
          continue;
        }

        discountedAmount = Math.max(discountedAmount, 0);
        discountedAmount = Math.round(discountedAmount * 100) / 100;

        // Actualizar en MercadoPago
        await this.mercadopago.updatePreapprovalAmount(
          subscription.externalId,
          discountedAmount,
        );

        // Marcar como aplicado
        await this.prisma.discount.update({
          where: { id: discount.id },
          data: { applied: true, appliedAt: new Date() },
        });

        this.logger.log(
          `Discount ${discount.id} applied: ${originalAmount} -> ${discountedAmount} for professional ${discount.professionalId}`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to apply discount ${discount.id}: ${error.message}`,
        );
      }
    }

    return discounts.length;
  }

  async restoreExpiredDiscounts() {
    const now = new Date();

    const discounts = await this.prisma.discount.findMany({
      where: {
        applied: true,
        restored: false,
        endDate: { lt: now },
      },
      include: {
        professional: {
          select: {
            id: true,
            userId: true,
          },
        },
      },
    });

    for (const discount of discounts) {
      try {
        // Buscar suscripción activa del profesional
        const subscription = await this.prisma.subscription.findFirst({
          where: {
            userId: discount.professional.userId,
            status: { in: ['active', 'authorized'] },
          },
          include: { plan: true },
        });

        if (!subscription?.externalId) {
          this.logger.warn(
            `No active subscription for professional ${discount.professionalId}, marking discount ${discount.id} as restored`,
          );
          await this.prisma.discount.update({
            where: { id: discount.id },
            data: { restored: true, restoredAt: new Date() },
          });
          continue;
        }

        // Restaurar monto original del plan
        const originalAmount = Number(subscription.plan.amount);
        await this.mercadopago.updatePreapprovalAmount(
          subscription.externalId,
          originalAmount,
        );

        // Marcar como restaurado
        await this.prisma.discount.update({
          where: { id: discount.id },
          data: { restored: true, restoredAt: new Date() },
        });

        this.logger.log(
          `Discount ${discount.id} restored: amount back to ${originalAmount} for professional ${discount.professionalId}`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to restore discount ${discount.id}: ${error.message}`,
        );
      }
    }

    return discounts.length;
  }
}
