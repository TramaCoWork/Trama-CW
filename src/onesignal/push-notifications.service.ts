import { Injectable, Logger } from '@nestjs/common';
import { NotifSourceType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { OneSignalService } from './onesignal.service';

const PUSH_PROVIDER = 'onesignal';
const PREVIEW_MAX_LENGTH = 140;

type NewChannelPostParams = {
  channelId: string;
  postId: string;
  authorId: string;
  content: string;
};

@Injectable()
export class PushNotificationsService {
  private readonly logger = new Logger(PushNotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly oneSignal: OneSignalService,
  ) {}

  /**
   * Push inmediato al publicar un post en un grupo (channel).
   * Destinatarios = miembros aceptados del canal, excluyendo al autor, que NO
   * tengan el push silenciado para ese canal. Fire-and-forget: nunca lanza.
   */
  async notifyNewChannelPost(params: NewChannelPostParams): Promise<void> {
    try {
      const { channelId, postId, authorId, content } = params;

      const channel = await this.prisma.communityChannel.findUnique({
        where: { id: channelId },
        select: { id: true, name: true, isActive: true },
      });

      if (!channel || !channel.isActive) {
        return;
      }

      const members = await this.prisma.communityChannelMember.findMany({
        where: {
          channelId,
          accepted: true,
          userId: { not: authorId },
        },
        select: { userId: true },
      });

      const memberIds = members.map((member) => member.userId);
      if (memberIds.length === 0) {
        return;
      }

      const recipientIds = await this.filterByPushPreference(
        memberIds,
        NotifSourceType.channel,
        channelId,
      );
      if (recipientIds.length === 0) {
        return;
      }

      const subscriptionIds = await this.getSubscriptionIds(recipientIds);
      if (subscriptionIds.length === 0) {
        return;
      }

      await this.oneSignal.sendToSubscriptions({
        subscriptionIds,
        title: channel.name,
        message: this.buildPreview(content),
        data: { type: 'channel', channelId, postId },
      });
    } catch (error) {
      this.logger.error(`notifyNewChannelPost fallo: ${String(error)}`);
    }
  }

  /**
   * Modelo opt-out: se excluyen los usuarios con push=false para ese origen.
   * Sin registro => push habilitado.
   */
  private async filterByPushPreference(
    userIds: string[],
    sourceType: NotifSourceType,
    sourceId: string,
  ): Promise<string[]> {
    const optedOut = await this.prisma.notificationPreference.findMany({
      where: {
        userId: { in: userIds },
        sourceType,
        sourceId,
        push: false,
      },
      select: { userId: true },
    });

    const optedOutSet = new Set(optedOut.map((pref) => pref.userId));
    return userIds.filter((id) => !optedOutSet.has(id));
  }

  private async getSubscriptionIds(userIds: string[]): Promise<string[]> {
    const subscriptions = await this.prisma.pushSubscription.findMany({
      where: { userId: { in: userIds }, provider: PUSH_PROVIDER },
      select: { subscriptionId: true },
    });

    return subscriptions.map((sub) => sub.subscriptionId);
  }

  private buildPreview(content: string): string {
    const trimmed = content.trim();
    return trimmed.length > PREVIEW_MAX_LENGTH
      ? `${trimmed.slice(0, PREVIEW_MAX_LENGTH)}…`
      : trimmed;
  }
}
