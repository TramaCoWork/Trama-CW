import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
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
    return this.prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOne(id: string) {
    const plan = await this.prisma.subscriptionPlan.findUnique({ where: { id } });
    if (!plan) throw new NotFoundException('Plan no encontrado');
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
}
