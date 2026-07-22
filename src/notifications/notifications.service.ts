import { Injectable } from '@nestjs/common';
import { NotifSourceType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertNotificationPreferenceDto } from './dto/upsert-notification-preference.dto';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async getPreferences(userId: string) {
    return this.prisma.notificationPreference.findMany({ where: { userId } });
  }

  async upsertPreference(userId: string, dto: UpsertNotificationPreferenceDto) {
    return this.prisma.notificationPreference.upsert({
      where: {
        userId_sourceId_sourceType: {
          userId,
          sourceId: dto.sourceId,
          sourceType: dto.sourceType,
        },
      },
      update: {
        email: dto.email ?? true,
        push: dto.push ?? true,
      },
      create: {
        userId,
        sourceId: dto.sourceId,
        sourceType: dto.sourceType,
        email: dto.email ?? true,
        push: dto.push ?? true,
      },
    });
  }

  async deletePreference(
    userId: string,
    sourceId: string,
    sourceType: NotifSourceType,
  ) {
    const { count } = await this.prisma.notificationPreference.deleteMany({
      where: { userId, sourceId, sourceType },
    });

    return { ok: true, deleted: count };
  }

  async getPreference(
    userId: string,
    sourceId: string,
    sourceType: NotifSourceType,
  ) {
    const pref = await this.prisma.notificationPreference.findUnique({
      where: { userId_sourceId_sourceType: { userId, sourceId, sourceType } },
    });

    return { email: pref?.email ?? true, push: pref?.push ?? true };
  }
}
