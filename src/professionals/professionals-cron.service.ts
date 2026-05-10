import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProfessionalsCronService {
  private readonly logger = new Logger(ProfessionalsCronService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleExpiredTrials() {
    const now = new Date();

    const result = await this.prisma.professionalProfile.updateMany({
      where: {
        profileStatus: 'active',
        trialEndDate: { lt: now },
      },
      data: {
        profileStatus: 'waiting_payment',
        isActive: false,
        trialEndDate: null,
      },
    });

    if (result.count > 0) {
      this.logger.log(`Expired trials: ${result.count} profiles moved to waiting_payment`);
    }
  }
}
