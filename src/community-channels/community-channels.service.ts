import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { sanitizeMarkdown } from '../community/utils/sanitize-markdown';

@Injectable()
export class CommunityChannelsService {
  constructor(private readonly prisma: PrismaService) {}

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
    const [data, total] = await Promise.all([
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
}
