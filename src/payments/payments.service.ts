import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentStatus } from '@prisma/client';

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreatePaymentDto) {
    return this.prisma.payment.create({
      data: {
        userId,
        amount: dto.amount,
        currency: dto.currency ?? 'ARS',
        paymentProvider: dto.paymentProvider,
        status: PaymentStatus.pending,
      },
    });
  }

  async handleWebhook(body: Record<string, unknown>): Promise<{ received: boolean }> {
    if (body.type === 'payment') {
      const data = body.data as Record<string, unknown> | undefined;
      const externalId = data?.id;

      if (externalId !== undefined && externalId !== null) {
        const payment = await this.prisma.payment.findFirst({
          where: { externalId: String(externalId) },
        });

        if (payment && body.action === 'payment.updated') {
          const dataStatus = (data as Record<string, unknown>)?.status;
          if (dataStatus === 'approved') {
            await this.prisma.payment.update({
              where: { id: payment.id },
              data: { status: PaymentStatus.completed },
            });

            await this.prisma.professionalProfile.updateMany({
              where: { userId: payment.userId },
              data: { isActive: true, profileStatus: 'active' },
            });
          }
        }
      }
    }

    return { received: true };
  }

  async getStatus(userId: string) {
    return this.prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
