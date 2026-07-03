import {
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePostDto } from './dto/create-post.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { PostStatus } from '@prisma/client';
import { sanitizeMarkdown } from './utils/sanitize-markdown';
import { withoutDeleted } from '../common/filters/soft-delete.filter';

const GENERAL_CHANNEL = 'general';

type UserRolePayload = { name: string; type: string };

@Injectable()
export class CommunityService {
  constructor(private readonly prisma: PrismaService) {}

  async markCommunitySeen(channelSlug: string, userId: string): Promise<void> {
    await this.prisma.communityLastSeen.upsert({
      where: { userId_channelSlug: { userId, channelSlug } },
      update: { lastSeenAt: new Date() },
      create: { userId, channelSlug, lastSeenAt: new Date() },
    });
  }

  async getCommunityUnreadCount(
    channelSlug: string,
    userId: string,
  ): Promise<{ count: number }> {
    const lastSeen = await this.prisma.communityLastSeen.findUnique({
      where: { userId_channelSlug: { userId, channelSlug } },
    });

    const count = await this.prisma.communityPost.count({
      where: {
        channelSlug,
        deletedAt: null,
        ...(lastSeen ? { createdAt: { gt: lastSeen.lastSeenAt } } : {}),
      },
    });

    return { count };
  }

  /**
   * Returns the channels the user can access:
   * - community channels: "general" (always) and user's rubro (if present)
   * - channel channels: accepted active memberships from CommunityChannel
   */
  async getChannels(userId: string) {
    const profile = await this.prisma.professionalProfile.findUnique({
      where: withoutDeleted({ userId }),
      include: { rubro: true },
    });

    const channelMembers = await this.prisma.communityChannelMember.findMany({
      where: {
        userId,
        accepted: true,
        channel: { isActive: true },
      },
      include: {
        channel: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    const channels = [
      { type: 'community' as const, slug: GENERAL_CHANNEL, name: 'General' },
    ];

    if (profile?.rubro) {
      channels.push({
        type: 'community' as const,
        slug: profile.rubro.slug,
        name: profile.rubro.name,
      });
    }

    const memberChannels = channelMembers.map(({ channel }) => ({
      type: 'channel' as const,
      slug: channel.id,
      name: channel.name,
    }));

    return [...channels, ...memberChannels];
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

  private isAdmin(roles: UserRolePayload[]): boolean {
    return roles.some((role) => role.type === 'admin' || role.name === 'admin');
  }

  private isProfessional(roles: UserRolePayload[]): boolean {
    return roles.some(
      (role) => role.type === 'professional' || role.name === 'professional',
    );
  }

  async checkChannelAccess(
    userId: string,
    roles: UserRolePayload[],
    channelSlug: string,
  ): Promise<void> {
    if (this.isAdmin(roles) || channelSlug === GENERAL_CHANNEL) {
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
      },
      select: { channelSlug: true },
      distinct: ['channelSlug'],
      orderBy: { channelSlug: 'asc' },
    });

    return channels.map((channel) => channel.channelSlug);
  }

  async getChannelPosts(
    userId: string,
    roles: UserRolePayload[],
    channelSlug: string,
    page: number,
    limit: number,
  ) {
    await this.checkChannelAccess(userId, roles, channelSlug);

    const where =
      this.isProfessional(roles) && channelSlug !== GENERAL_CHANNEL
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
          user: {
            select: {
              id: true,
              email: true,
              profile: { select: { name: true } },
            },
          },
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
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getPostById(id: string, userId: string, roles: UserRolePayload[]) {
    const post = await this.prisma.communityPost.findUnique({
      where: {
        id,
        deletedAt: null,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            profile: { select: { name: true } },
          },
        },
        _count: { select: { comments: { where: { deletedAt: null } } } },
      },
    });

    if (!post) {
      throw new NotFoundException('Post no encontrado');
    }

    await this.checkChannelAccess(userId, roles, post.channelSlug);

    const { _count, ...postData } = post;

    return {
      ...postData,
      commentCount: _count.comments,
    };
  }

  async getPosts(
    userId: string,
    roles: UserRolePayload[],
    channelSlug: string,
    page: number,
    limit: number,
  ) {
    return this.getChannelPosts(userId, roles, channelSlug, page, limit);
  }

  /**
   * Get all posts by the current user with their comments.
   */
  async getMyPosts(userId: string, page: number, limit: number) {
    const where = { userId, deletedAt: null };
    const [communityPosts, channelPosts, communityCount, channelCount] =
      await Promise.all([
        this.prisma.communityPost.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          include: {
            user: {
              select: {
                id: true,
                email: true,
                profile: { select: { name: true } },
              },
            },
            _count: { select: { comments: { where: { deletedAt: null } } } },
          },
        }),
        this.prisma.communityChannelPost.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          include: {
            channel: { select: { name: true } },
          },
        }),
        this.prisma.communityPost.count({ where }),
        this.prisma.communityChannelPost.count({ where }),
      ]);

    const nonGeneralSlugs = Array.from(
      new Set(
        communityPosts
          .map((post) => post.channelSlug)
          .filter((slug) => slug !== GENERAL_CHANNEL),
      ),
    );

    const professionCategories =
      nonGeneralSlugs.length > 0
        ? await this.prisma.professionCategory.findMany({
            where: { slug: { in: nonGeneralSlugs } },
            select: { slug: true, name: true },
          })
        : [];

    const slugNameMap = professionCategories.reduce<Record<string, string>>(
      (map, category) => {
        map[category.slug] = category.name;
        return map;
      },
      { [GENERAL_CHANNEL]: 'General' },
    );

    const communityData = communityPosts.map(({ _count, ...post }) => ({
      type: 'community' as const,
      ...post,
      channelName: slugNameMap[post.channelSlug] ?? post.channelSlug,
      commentCount: _count.comments,
    }));

    const channelData = channelPosts.map(({ channel, ...post }) => ({
      type: 'channel' as const,
      ...post,
      channelName: channel.name,
    }));

    const total = communityCount + channelCount;
    const start = (page - 1) * limit;
    const data = [...communityData, ...channelData]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(start, start + limit);

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async createPost(
    userId: string,
    roles: UserRolePayload[],
    dto: CreatePostDto,
  ) {
    const channelSlug = dto.channelSlug ?? GENERAL_CHANNEL;

    await this.checkChannelAccess(userId, roles, channelSlug);

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

  async createComment(
    userId: string,
    roles: UserRolePayload[],
    dto: CreateCommentDto,
  ) {
    const post = await this.prisma.communityPost.findUnique({
      where: { id: dto.postId },
    });

    if (!post || post.deletedAt) {
      throw new NotFoundException('Post no encontrado');
    }

    await this.checkChannelAccess(userId, roles, post.channelSlug);

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
  async deletePost(
    userId: string,
    rolesOrAdmin: UserRolePayload[] | boolean,
    postId: string,
  ) {
    const post = await this.prisma.communityPost.findUnique({
      where: { id: postId },
    });

    if (!post || post.deletedAt) {
      throw new NotFoundException('Post no encontrado');
    }

    const isAdmin =
      typeof rolesOrAdmin === 'boolean'
        ? rolesOrAdmin
        : this.isAdmin(rolesOrAdmin);

    if (post.userId !== userId && !isAdmin) {
      throw new ForbiddenException(
        'Solo el creador del post o un admin pueden eliminarlo',
      );
    }

    return this.prisma.communityPost.update({
      where: { id: postId },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * Soft delete a comment. Only the comment owner (userId) or an admin can do this.
   */
  async deleteComment(
    userId: string,
    rolesOrAdmin: UserRolePayload[] | boolean,
    commentId: string,
  ) {
    const comment = await this.prisma.communityComment.findUnique({
      where: { id: commentId },
    });

    if (!comment || comment.deletedAt) {
      throw new NotFoundException('Comentario no encontrado');
    }

    const isAdmin =
      typeof rolesOrAdmin === 'boolean'
        ? rolesOrAdmin
        : this.isAdmin(rolesOrAdmin);

    if (comment.userId !== userId && !isAdmin) {
      throw new ForbiddenException(
        'Solo el creador del comentario o un admin pueden eliminarlo',
      );
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
  async getPostComments(
    postId: string,
    userId: string,
    roles: UserRolePayload[],
    page: number,
    limit: number,
  ) {
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

    await this.checkChannelAccess(userId, roles, post.channelSlug);

    const where = { postId, deletedAt: null };
    const [data, total] = await Promise.all([
      this.prisma.communityComment.findMany({
        where,
        orderBy: { createdAt: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              profile: { select: { name: true } },
            },
          },
        },
      }),
      this.prisma.communityComment.count({ where }),
    ]);

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
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
      throw new ForbiddenException(
        'Solo el creador del post puede cambiar su estado',
      );
    }

    return this.prisma.communityPost.update({
      where: { id: postId },
      data: { status },
    });
  }
}
