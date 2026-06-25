import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { withoutDeleted } from '../common/filters/soft-delete.filter';
import { CreatePlanDto } from './dto/create-plan.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';

@Injectable()
export class SubscriptionPlansService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreatePlanDto) {
    return this.prisma.subscriptionPlan.create({
      data: {
        name: dto.name,
        description: dto.description,
        amount: dto.amount,
        currency: dto.currency ?? 'ARS',
        frequency: dto.frequency ?? 1,
        frequencyType: dto.frequencyType ?? 'months',
        trialDays: dto.trialDays ?? 0,
      },
    });
  }

  async findAllActive() {
    const now = new Date();
    const plans = await this.prisma.subscriptionPlan.findMany({
      where: withoutDeleted({ isActive: true }),
      orderBy: { createdAt: 'asc' },
      include: {
        discountPlans: {
          where: {
            isActive: true,
            deletedAt: null,
            fromDate: { lte: now },
            toDate: { gte: now },
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    return plans.map((plan) => {
      const { discountPlans, ...rest } = plan;
      const discount = discountPlans[0] ?? null;
      // Verificar límite de usos: maxUses null = sin límite; si maxUses <= currentUses = agotado
      const activeDiscount =
        discount && (discount.maxUses === null || discount.currentUses < discount.maxUses)
          ? discount
          : null;
      return { ...rest, discount: activeDiscount };
    });
  }

  async findOne(id: string) {
    const now = new Date();
    const plan = await this.prisma.subscriptionPlan.findFirst({
      where: withoutDeleted({ id }),
      include: {
        discountPlans: {
          where: {
            isActive: true,
            deletedAt: null,
            fromDate: { lte: now },
            toDate: { gte: now },
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });
    if (!plan) throw new NotFoundException('Plan no encontrado');
    const { discountPlans, ...rest } = plan;
    const discount = discountPlans[0] ?? null;
    const activeDiscount =
      discount && (discount.maxUses === null || discount.currentUses < discount.maxUses)
        ? discount
        : null;
    return { ...rest, discount: activeDiscount };
  }

  async findOneActive(id: string) {
    const plan = await this.findOne(id);
    if (!plan.isActive) {
      throw new BadRequestException('Plan no está activo');
    }
    return plan;
  }

  async update(id: string, dto: UpdatePlanDto) {
    await this.findOne(id);
    return this.prisma.subscriptionPlan.update({
      where: { id },
      data: dto,
    });
  }

  async deactivate(id: string) {
    await this.findOne(id);
    return this.prisma.subscriptionPlan.update({
      where: { id },
      data: { isActive: false },
    });
  }

  /** Borrado lógico: marca el plan como eliminado sin borrar la fila. */
  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.subscriptionPlan.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  /** Revierte el borrado lógico de un plan. */
  async restore(id: string) {
    const plan = await this.prisma.subscriptionPlan.findUnique({ where: { id } });
    if (!plan) throw new NotFoundException('Plan no encontrado');
    return this.prisma.subscriptionPlan.update({
      where: { id },
      data: { deletedAt: null },
    });
  }
}
