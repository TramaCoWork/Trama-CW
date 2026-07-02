import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { withoutDeleted } from '../common/filters/soft-delete.filter';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDiscountPlanDto } from './dto/create-discount-plan.dto';
import { UpdateDiscountPlanDto } from './dto/update-discount-plan.dto';

@Injectable()
export class DiscountPlansService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateDiscountPlanDto) {
    await this.ensureSubscriptionPlanExists(dto.subscriptionPlanId);
    await this.validateActiveOverlap({
      subscriptionPlanId: dto.subscriptionPlanId,
      isActive: dto.isActive ?? true,
      fromDate: dto.fromDate,
      toDate: dto.toDate,
    });

    return this.prisma.discountPlan.create({
      data: {
        subscriptionPlanId: dto.subscriptionPlanId,
        discountAmount: new Prisma.Decimal(dto.discountAmount),
        description: dto.description,
        isActive: dto.isActive ?? true,
        fromDate: new Date(dto.fromDate),
        toDate: new Date(dto.toDate),
        billingCycles: dto.billingCycles,
        maxUses: dto.maxUses,
        currentUses: 0,
        perUserLimit: dto.perUserLimit,
      },
    });
  }

  async findAll() {
    return this.prisma.discountPlan.findMany({
      where: withoutDeleted(),
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOne(id: string) {
    const discountPlan = await this.prisma.discountPlan.findFirst({
      where: withoutDeleted({ id }),
    });

    if (!discountPlan) {
      throw new NotFoundException('Discount plan no encontrado');
    }

    return discountPlan;
  }

  async update(id: string, dto: UpdateDiscountPlanDto) {
    const existing = await this.findOne(id);

    if (dto.subscriptionPlanId !== undefined) {
      await this.ensureSubscriptionPlanExists(dto.subscriptionPlanId);
    }

    const nextSubscriptionPlanId =
      dto.subscriptionPlanId ?? existing.subscriptionPlanId;
    const nextIsActive = dto.isActive ?? existing.isActive;
    const nextFromDate = dto.fromDate ?? existing.fromDate.toISOString();
    const nextToDate = dto.toDate ?? existing.toDate.toISOString();

    await this.validateActiveOverlap({
      subscriptionPlanId: nextSubscriptionPlanId,
      isActive: nextIsActive,
      fromDate: nextFromDate,
      toDate: nextToDate,
      excludeId: existing.id,
    });

    const data: Prisma.DiscountPlanUncheckedUpdateInput = {};

    if (dto.subscriptionPlanId !== undefined)
      data.subscriptionPlanId = dto.subscriptionPlanId;
    if (dto.discountAmount !== undefined)
      data.discountAmount = new Prisma.Decimal(dto.discountAmount);
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.fromDate !== undefined) data.fromDate = new Date(dto.fromDate);
    if (dto.toDate !== undefined) data.toDate = new Date(dto.toDate);
    if (dto.billingCycles !== undefined) data.billingCycles = dto.billingCycles;
    if (dto.maxUses !== undefined) data.maxUses = dto.maxUses;
    if (dto.perUserLimit !== undefined) data.perUserLimit = dto.perUserLimit;

    if (Object.keys(data).length === 0) {
      return existing;
    }

    return this.prisma.discountPlan.update({
      where: { id },
      data,
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.discountPlan.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  private async ensureSubscriptionPlanExists(subscriptionPlanId: string) {
    const plan = await this.prisma.subscriptionPlan.findFirst({
      where: withoutDeleted({ id: subscriptionPlanId }),
      select: { id: true },
    });

    if (!plan) {
      throw new NotFoundException('Subscription plan no encontrado');
    }
  }

  private async validateActiveOverlap(params: {
    subscriptionPlanId: string;
    isActive: boolean;
    fromDate?: string;
    toDate?: string;
    excludeId?: string;
  }) {
    if (!params.isActive || !params.fromDate || !params.toDate) {
      return;
    }

    const fromDate = new Date(params.fromDate);
    const toDate = new Date(params.toDate);

    if (toDate < fromDate) {
      throw new BadRequestException('toDate debe ser mayor o igual a fromDate');
    }

    const overlap = await this.prisma.discountPlan.findFirst({
      where: withoutDeleted({
        subscriptionPlanId: params.subscriptionPlanId,
        isActive: true,
        id: params.excludeId ? { not: params.excludeId } : undefined,
        fromDate: { lte: toDate },
        toDate: { gte: fromDate },
      }),
      select: { id: true },
    });

    if (overlap) {
      throw new BadRequestException(
        'Ya existe un discount plan activo en ese rango para este subscription plan',
      );
    }
  }
}
