import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, PrivateMessage } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { sanitizeMarkdown } from '../community/utils/sanitize-markdown';
import { CreateMessageDto } from './dto/create-message.dto';

type ConversationSummary = {
  otherUserId: string;
  otherUserName: string | null;
  otherUserEmail: string;
  lastMessage: PrivateMessage;
  unreadCount: number;
};

type RecipientSuggestion = {
  id: string;
  name: string;
  photo: string | null;
};

@Injectable()
export class MessagesService {
  constructor(private readonly prisma: PrismaService) {}

  async sendMessage(senderId: string, dto: CreateMessageDto) {
    if (senderId === dto.receiverId) {
      throw new BadRequestException('No puedes enviarte mensajes a ti mismo');
    }

    return this.prisma.privateMessage.create({
      data: {
        senderId,
        receiverId: dto.receiverId,
        content: sanitizeMarkdown(dto.content),
      },
    });
  }

  async getConversations(userId: string, cursor?: string, take = 20): Promise<ConversationSummary[]> {
    const filters = this.visibleMessageFiltersForUser(userId);
    const messages = await this.prisma.privateMessage.findMany({
      where: { OR: filters },
      orderBy: { sentAt: 'desc' },
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      take: Math.max(take, 1) * 10,
    });

    const seen = new Set<string>();
    const conversationMessages: PrivateMessage[] = [];

    for (const message of messages) {
      const otherUserId = message.senderId === userId ? message.receiverId : message.senderId;
      if (seen.has(otherUserId)) {
        continue;
      }

      seen.add(otherUserId);
      conversationMessages.push(message);

      if (conversationMessages.length === take) {
        break;
      }
    }

    return Promise.all(
      conversationMessages.map(async (message) => {
        const otherUserId = message.senderId === userId ? message.receiverId : message.senderId;
        const otherUser = await this.prisma.user.findUnique({
          where: { id: otherUserId },
          select: {
            email: true,
            profile: {
              select: {
                name: true,
              },
            },
          },
        });

        const unreadCount = await this.prisma.privateMessage.count({
          where: {
            senderId: otherUserId,
            receiverId: userId,
            readAt: null,
            deletedByReceiver: false,
          },
        });

        return {
          otherUserId,
          otherUserName: otherUser?.profile?.name ?? null,
          otherUserEmail: otherUser?.email ?? '',
          lastMessage: message,
          unreadCount,
        };
      }),
    );
  }

  async getMessages(userId: string, otherUserId: string, cursor?: string, take = 20) {
    const isSoftDeletedFilter: Prisma.PrivateMessageWhereInput = {
      OR: [
        { senderId: userId, deletedBySender: false },
        { receiverId: userId, deletedByReceiver: false },
      ],
    };

    return this.prisma.privateMessage.findMany({
      where: {
        AND: [
          {
            OR: [
              { senderId: userId, receiverId: otherUserId },
              { senderId: otherUserId, receiverId: userId },
            ],
          },
          isSoftDeletedFilter,
        ],
      },
      orderBy: { sentAt: 'desc' },
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      take,
    });
  }

  async markAsRead(userId: string, messageId: string) {
    const message = await this.prisma.privateMessage.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new NotFoundException('Mensaje no encontrado');
    }

    if (message.receiverId !== userId) {
      throw new ForbiddenException('Solo el destinatario puede marcar el mensaje como leído');
    }

    if (message.readAt) {
      return message;
    }

    return this.prisma.privateMessage.update({
      where: { id: messageId },
      data: { readAt: new Date() },
    });
  }

  async deleteMessage(userId: string, messageId: string, forAll = false) {
    const message = await this.prisma.privateMessage.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new NotFoundException('Mensaje no encontrado');
    }

    if (message.senderId !== userId && message.receiverId !== userId) {
      throw new ForbiddenException('No tienes permisos para eliminar este mensaje');
    }

    if (forAll) {
      if (message.senderId !== userId) {
        throw new ForbiddenException('Solo el remitente puede eliminar el mensaje para todos');
      }

      return this.prisma.privateMessage.update({
        where: { id: messageId },
        data: {
          deletedBySender: true,
          deletedByReceiver: true,
        },
      });
    }

    const data = message.senderId === userId
      ? { deletedBySender: true }
      : { deletedByReceiver: true };

    return this.prisma.privateMessage.update({
      where: { id: messageId },
      data,
    });
  }

  async deleteConversation(userId: string, otherUserId: string) {
    await this.prisma.privateMessage.updateMany({
      where: {
        senderId: userId,
        receiverId: otherUserId,
      },
      data: {
        deletedBySender: true,
      },
    });

    await this.prisma.privateMessage.updateMany({
      where: {
        senderId: otherUserId,
        receiverId: userId,
      },
      data: {
        deletedByReceiver: true,
      },
    });

    return { success: true };
  }

  async searchRecipients(userId: string, term: string): Promise<RecipientSuggestion[]> {
    const cleanTerm = term.trim();
    if (!cleanTerm) {
      return [];
    }

    const profiles = await this.prisma.professionalProfile.findMany({
      where: {
        userId: { not: userId },
        isActive: true,
        profileStatus: 'active',
        user: { emailVerified: true },
        name: { contains: cleanTerm, mode: 'insensitive' },
      },
      select: {
        userId: true,
        name: true,
        photo: true,
      },
      orderBy: { name: 'asc' },
      take: 10,
    });

    return profiles.map((profile) => ({
      id: profile.userId,
      name: profile.name,
      photo: profile.photo,
    }));
  }

  private visibleMessageFiltersForUser(userId: string): Prisma.PrivateMessageWhereInput[] {
    return [
      { senderId: userId, deletedBySender: false },
      { receiverId: userId, deletedByReceiver: false },
    ];
  }
}
