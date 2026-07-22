import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PostStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { sanitizeMarkdown } from '../community/utils/sanitize-markdown';

type UserRolePayload = { name: string; type: string };

@Injectable()
export class CommunityChannelsService {
  constructor(private readonly prisma: PrismaService) {}

  private isAdmin(roles: UserRolePayload[]): boolean {
    return roles.some((role) => role.type === 'admin' || role.name === 'admin');
  }

  async markChannelSeen(channelId: string, userId: string): Promise<void> {
    await this.prisma.channelLastSeen.upsert({
      where: { userId_channelId: { userId, channelId } },
      update: { lastSeenAt: new Date() },
      create: { userId, channelId, lastSeenAt: new Date() },
    });
  }

  async getChannelUnreadCount(
    channelId: string,
    userId: string,
  ): Promise<{ count: number }> {
    const lastSeen = await this.prisma.channelLastSeen.findUnique({
      where: { userId_channelId: { userId, channelId } },
    });

    const count = await this.prisma.communityChannelPost.count({
      where: {
        channelId,
        deletedAt: null,
        ...(lastSeen ? { createdAt: { gt: lastSeen.lastSeenAt } } : {}),
      },
    });

    return { count };
  }

  async getChannels(userId: string) {
    return this.prisma.communityChannel.findMany({
      where: {
        isActive: true,
        members: {
          some: {
            userId,
            accepted: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getChannelPosts(channelId: string, page: number, limit: number) {
    const [posts, total] = await Promise.all([
      this.prisma.communityChannelPost.findMany({
        where: {
          channelId,
          deletedAt: null,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.communityChannelPost.count({
        where: {
          channelId,
          deletedAt: null,
        },
      }),
    ]);

    const userIds = [...new Set(posts.map((post) => post.userId))];
    const users =
      userIds.length === 0
        ? []
        : await this.prisma.user.findMany({
            where: { id: { in: userIds } },
            select: {
              id: true,
              email: true,
              profile: {
                select: {
                  name: true,
                },
              },
            },
          });

    const userMap = new Map(
      users.map((user) => [
        user.id,
        {
          email: user.email,
          nombre: user.profile?.name ?? user.email,
        },
      ]),
    );

    const data = posts.map((post) => {
      const user = userMap.get(post.userId);
      const email = user?.email ?? '';

      return {
        ...post,
        email,
        nombre: user?.nombre ?? email,
      };
    });

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
      },
    };
  }

  async getPost(channelId: string, postId: string) {
    const post = await this.prisma.communityChannelPost.findFirst({
      where: {
        id: postId,
        channelId,
        deletedAt: null,
      },
    });

    if (!post) {
      throw new NotFoundException('Post no encontrado');
    }

    return post;
  }

  async getPostComments(
    channelId: string,
    postId: string,
    page: number,
    limit: number,
  ) {
    const post = await this.prisma.communityChannelPost.findFirst({
      where: {
        id: postId,
        channelId,
      },
      select: { id: true },
    });

    if (!post) {
      throw new NotFoundException('Post no encontrado');
    }

    const [comments, total] = await Promise.all([
      this.prisma.communityChannelComment.findMany({
        where: {
          postId,
          deletedAt: null,
        },
        orderBy: { createdAt: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.communityChannelComment.count({
        where: {
          postId,
          deletedAt: null,
        },
      }),
    ]);

    const userIds = [...new Set(comments.map((comment) => comment.userId))];
    const users =
      userIds.length === 0
        ? []
        : await this.prisma.user.findMany({
            where: { id: { in: userIds } },
            select: {
              id: true,
              email: true,
              profile: {
                select: {
                  name: true,
                },
              },
            },
          });

    const userMap = new Map(
      users.map((user) => [
        user.id,
        {
          email: user.email,
          nombre: user.profile?.name ?? user.email,
        },
      ]),
    );

    const data = comments.map((comment) => {
      const user = userMap.get(comment.userId);
      const email = user?.email ?? '';

      return {
        ...comment,
        email,
        nombre: user?.nombre ?? email,
      };
    });

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
      },
    };
  }

  async createPost(channelId: string, userId: string, content: string) {
    const channel = await this.prisma.communityChannel.findFirst({
      where: {
        id: channelId,
        isActive: true,
      },
      select: { id: true },
    });

    if (!channel) {
      throw new NotFoundException('Canal no encontrado');
    }

    return this.prisma.communityChannelPost.create({
      data: {
        channelId,
        userId,
        content: sanitizeMarkdown(content),
      },
    });
  }

  async createComment(
    channelId: string,
    postId: string,
    userId: string,
    content: string,
  ) {
    const post = await this.prisma.communityChannelPost.findFirst({
      where: {
        id: postId,
        channelId,
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!post) {
      throw new NotFoundException('Post no encontrado');
    }

    return this.prisma.communityChannelComment.create({
      data: {
        postId,
        userId,
        content: sanitizeMarkdown(content),
      },
    });
  }

  /**
   * Cambia el estado (published/paused) de un post de canal.
   * Solo el creador del post puede hacerlo.
   */
  async updatePostStatus(
    channelId: string,
    postId: string,
    userId: string,
    status: PostStatus,
  ) {
    const post = await this.prisma.communityChannelPost.findFirst({
      where: { id: postId, channelId, deletedAt: null },
    });

    if (!post) {
      throw new NotFoundException('Post no encontrado');
    }

    if (post.userId !== userId) {
      throw new ForbiddenException(
        'Solo el creador del post puede cambiar su estado',
      );
    }

    return this.prisma.communityChannelPost.update({
      where: { id: postId },
      data: { status },
    });
  }

  /**
   * Borrado logico de un post de canal. Solo el creador o un admin.
   */
  async deletePost(
    channelId: string,
    postId: string,
    userId: string,
    roles: UserRolePayload[],
  ) {
    const post = await this.prisma.communityChannelPost.findFirst({
      where: { id: postId, channelId, deletedAt: null },
    });

    if (!post) {
      throw new NotFoundException('Post no encontrado');
    }

    if (post.userId !== userId && !this.isAdmin(roles)) {
      throw new ForbiddenException(
        'Solo el creador del post o un admin pueden eliminarlo',
      );
    }

    return this.prisma.communityChannelPost.update({
      where: { id: postId },
      data: { deletedAt: new Date() },
    });
  }
}
