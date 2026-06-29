import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePostDto } from './dto/create-post.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UserRole, PostStatus } from '@prisma/client';
import { sanitizeMarkdown } from './utils/sanitize-markdown';
import { withoutDeleted } from '../common/filters/soft-delete.filter';

const GENERAL_CHANNEL = 'general';

@Injectable()
export class CommunityService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Returns the channels the user can access:
   * - "general" (always)
   * - the slug of their rubro (if they have a profile with a rubro)
   */
  async getChannels(userId: string) {
    const profile = await this.prisma.professionalProfile.findUnique({
      where: withoutDeleted({ userId }),
      include: { rubro: true },
    });

    const channels = [
      { slug: GENERAL_CHANNEL, name: 'General' },
    ];

    if (profile?.rubro) {
      channels.push({ slug: profile.rubro.slug, name: profile.rubro.name });
    }

    return channels;
  }

  /**
   * Get the rubro slug for a user (null if no profile/rubro).
   */
  private async getUserRubroSlug(userId: string): Promise<string | null> {
    const profile = await this.prisma.professionalProfile.findUnique({
      where: withoutDeleted({ userId }),
      include: { rubro: true },
    });
    return profile?.rubro?.slug ?? null;
  }

  async checkChannelAccess(userId: string, role: UserRole, channelSlug: string): Promise<void> {
    if (role === UserRole.admin || channelSlug === GENERAL_CHANNEL) {
      return;
    }

    const rubroSlug = await this.getUserRubroSlug(userId);
    if (rubroSlug !== channelSlug) {
      throw new ForbiddenException(
        `No tienes acceso al canal "${channelSlug}". Solo puedes acceder a "general" y al canal de tu rubro.`,
      );
    }
  }

  async getActiveChannels(): Promise<string[]> {
    const channels = await this.prisma.communityPost.findMany({
      where: {
        deletedAt: null,
        status: PostStatus.published,
      },
      select: { channelSlug: true },
      distinct: ['channelSlug'],
      orderBy: { channelSlug: 'asc' },
    });

    return channels.map((channel) => channel.channelSlug);
  }

  async getChannelPosts(userId: string, role: UserRole, channelSlug: string, page: number, limit: number) {
    await this.checkChannelAccess(userId, role, channelSlug);

    const where =
      role === UserRole.professional && channelSlug !== GENERAL_CHANNEL
        ? {
            deletedAt: null,
            status: PostStatus.published,
            channelSlug: { in: [channelSlug, GENERAL_CHANNEL] },
          }
        : {
            channelSlug,
            deletedAt: null,
            status: PostStatus.published,
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

    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async getPostById(id: string, userId: string, role: UserRole) {
    const post = await this.prisma.communityPost.findUnique({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        user: { select: { id: true, email: true, profile: { select: { name: true } } } },
        _count: { select: { comments: { where: { deletedAt: null } } } },
      },
    });

    if (!post) {
      throw new NotFoundException('Post no encontrado');
    }

    await this.checkChannelAccess(userId, role, post.channelSlug);

    const { _count, ...postData } = post;

    return {
      ...postData,
      commentCount: _count.comments,
    };
  }

  async getPosts(userId: string, role: UserRole, channelSlug: string, page: number, limit: number) {
    return this.getChannelPosts(userId, role, channelSlug, page, limit);
  }

  /**
   * Get all posts by the current user with their comments.
   */
  async getMyPosts(userId: string, page: number, limit: number) {
    const where = { userId, deletedAt: null };
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

    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async createPost(userId: string, role: UserRole, dto: CreatePostDto) {
    const channelSlug = dto.channelSlug ?? GENERAL_CHANNEL;

    await this.checkChannelAccess(userId, role, channelSlug);

    return this.prisma.communityPost.create({
      data: {
        userId,
        channelSlug,
        content: sanitizeMarkdown(dto.content),
      },
      include: {
        user: { select: { id: true, email: true } },
      },
    });
  }

  async createComment(userId: string, role: UserRole, dto: CreateCommentDto) {
    const post = await this.prisma.communityPost.findUnique({
      where: { id: dto.postId },
    });

    if (!post || post.deletedAt) {
      throw new NotFoundException('Post no encontrado');
    }

    await this.checkChannelAccess(userId, role, post.channelSlug);

    return this.prisma.communityComment.create({
      data: {
        postId: dto.postId,
        userId,
        content: sanitizeMarkdown(dto.content),
      },
      include: {
        user: { select: { id: true, email: true } },
      },
    });
  }

  /**
   * Soft delete a post. Only the post owner (userId) or an admin can do this.
   */
  async deletePost(userId: string, role: UserRole, postId: string) {
    const post = await this.prisma.communityPost.findUnique({
      where: { id: postId },
    });

    if (!post || post.deletedAt) {
      throw new NotFoundException('Post no encontrado');
    }

    if (post.userId !== userId && role !== UserRole.admin) {
      throw new ForbiddenException('Solo el creador del post o un admin pueden eliminarlo');
    }

    return this.prisma.communityPost.update({
      where: { id: postId },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * Soft delete a comment. Only the comment owner (userId) or an admin can do this.
   */
  async deleteComment(userId: string, role: UserRole, commentId: string) {
    const comment = await this.prisma.communityComment.findUnique({
      where: { id: commentId },
    });

    if (!comment || comment.deletedAt) {
      throw new NotFoundException('Comentario no encontrado');
    }

    if (comment.userId !== userId && role !== UserRole.admin) {
      throw new ForbiddenException('Solo el creador del comentario o un admin pueden eliminarlo');
    }

    return this.prisma.communityComment.update({
      where: { id: commentId },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * Get paginated comments for a post. Excludes soft-deleted comments.
   * Validates channel access.
   */
  async getPostComments(postId: string, userId: string, role: UserRole, page: number, limit: number) {
    const post = await this.prisma.communityPost.findFirst({
      where: {
        id: postId,
        deletedAt: null,
        status: PostStatus.published,
      },
    });

    if (!post || post.deletedAt) {
      throw new NotFoundException('Post no encontrado');
    }

    await this.checkChannelAccess(userId, role, post.channelSlug);

    const where = { postId, deletedAt: null };
    const [data, total] = await Promise.all([
      this.prisma.communityComment.findMany({
        where,
        orderBy: { createdAt: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: { select: { id: true, email: true, profile: { select: { name: true } } } },
        },
      }),
      this.prisma.communityComment.count({ where }),
    ]);

    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  /**
   * Update post status (published/paused). Only the post owner can do this.
   */
  async updatePostStatus(userId: string, postId: string, status: PostStatus) {
    const post = await this.prisma.communityPost.findUnique({
      where: { id: postId },
    });

    if (!post || post.deletedAt) {
      throw new NotFoundException('Post no encontrado');
    }

    if (post.userId !== userId) {
      throw new ForbiddenException('Solo el creador del post puede cambiar su estado');
    }

    return this.prisma.communityPost.update({
      where: { id: postId },
      data: { status },
    });
  }
}
