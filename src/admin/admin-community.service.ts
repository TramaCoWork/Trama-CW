import { Injectable, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CommunityService } from '../community/community.service';
import { sanitizeMarkdown } from '../community/utils/sanitize-markdown';

type ListPostsParams = {
  page: number;
  limit: number;
  channelSlug?: string;
};

@Injectable()
export class AdminCommunityService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly communityService: CommunityService,
  ) {}

  async listPosts({ page, limit, channelSlug }: ListPostsParams) {
    const where = {
      deletedAt: null,
      ...(channelSlug ? { channelSlug } : {}),
    };

    const [posts, total] = await Promise.all([
      this.prisma.communityPost.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: { select: { id: true, email: true, profile: { select: { name: true } } } },
          _count: { select: { comments: { where: { deletedAt: null } } } },
        },
      }),
      this.prisma.communityPost.count({ where }),
    ]);

    const data = posts.map(({ _count, ...post }) => ({
      ...post,
      commentCount: _count.comments,
    }));

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

  async createComment(postId: string, userId: string, content: string) {
    const post = await this.prisma.communityPost.findUnique({ where: { id: postId } });

    if (!post || post.deletedAt) {
      throw new NotFoundException('Post no encontrado');
    }

    return this.prisma.communityComment.create({
      data: {
        postId,
        userId,
        content: sanitizeMarkdown(content),
      },
      include: {
        user: { select: { id: true, email: true } },
      },
    });
  }

  async deletePost(postId: string, userId: string) {
    const existingPost = await this.prisma.communityPost.findUnique({
      where: { id: postId },
      select: { id: true, deletedAt: true },
    });

    if (!existingPost) {
      throw new NotFoundException('Post no encontrado');
    }

    if (!existingPost.deletedAt) {
      await this.communityService.deletePost(userId, UserRole.admin, postId);
    }

    return { message: 'Post eliminado logicamente' };
  }

  async deleteComment(commentId: string, userId: string) {
    const existingComment = await this.prisma.communityComment.findUnique({
      where: { id: commentId },
      select: { id: true, deletedAt: true },
    });

    if (!existingComment) {
      throw new NotFoundException('Comentario no encontrado');
    }

    if (!existingComment.deletedAt) {
      await this.communityService.deleteComment(userId, UserRole.admin, commentId);
    }

    return { message: 'Comentario eliminado logicamente' };
  }
}
