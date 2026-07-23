import {
  BadRequestException,
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

    const communityChannels = [
      { type: 'community' as const, slug: GENERAL_CHANNEL, name: 'General' },
    ];

    if (profile?.rubro) {
      communityChannels.push({
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

    const communityLastSeenRecords = await this.prisma.communityLastSeen.findMany({
      where: {
        userId,
        channelSlug: { in: communityChannels.map((channel) => channel.slug) },
      },
      select: { channelSlug: true, lastSeenAt: true },
    });

    const channelLastSeenRecords = await this.prisma.channelLastSeen.findMany({
      where: {
        userId,
        channelId: { in: memberChannels.map((channel) => channel.slug) },
      },
      select: { channelId: true, lastSeenAt: true },
    });

    const communityLastSeenMap = new Map(
      communityLastSeenRecords.map((record) => [record.channelSlug, record.lastSeenAt]),
    );

    const channelLastSeenMap = new Map(
      channelLastSeenRecords.map((record) => [record.channelId, record.lastSeenAt]),
    );

    const communityWithUnread = await Promise.all(
      communityChannels.map(async (channel) => {
        const lastSeenAt = communityLastSeenMap.get(channel.slug);
        const unreadCount = await this.prisma.communityPost.count({
          where: {
            channelSlug: channel.slug,
            deletedAt: null,
            ...(lastSeenAt ? { createdAt: { gt: lastSeenAt } } : {}),
          },
        });

        return { ...channel, unreadCount };
      }),
    );

    const memberWithUnread = await Promise.all(
      memberChannels.map(async (channel) => {
        const lastSeenAt = channelLastSeenMap.get(channel.slug);
        const unreadCount = await this.prisma.communityChannelPost.count({
          where: {
            channelId: channel.slug,
            deletedAt: null,
            ...(lastSeenAt ? { createdAt: { gt: lastSeenAt } } : {}),
          },
        });

        return { ...channel, unreadCount };
      }),
    );

    return [...communityWithUnread, ...memberWithUnread];
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

  /**
   * Resuelve los "scopes" a los que el usuario tiene acceso para el feed:
   * - community: "general" (siempre) + el canal de su rubro (si tiene perfil).
   * - grupos: canales activos donde tiene membresia aceptada.
   * Devuelve tambien los mapas slug/id -> nombre legible para pintar el feed.
   */
  private async getAccessibleScopes(userId: string) {
    const profile = await this.prisma.professionalProfile.findUnique({
      where: withoutDeleted({ userId }),
      include: { rubro: true },
    });

    const communitySlugs = [GENERAL_CHANNEL];
    const communityNameMap = new Map<string, string>([
      [GENERAL_CHANNEL, 'General'],
    ]);

    if (profile?.rubro) {
      communitySlugs.push(profile.rubro.slug);
      communityNameMap.set(profile.rubro.slug, profile.rubro.name);
    }

    const memberships = await this.prisma.communityChannelMember.findMany({
      where: {
        userId,
        accepted: true,
        channel: { isActive: true },
      },
      include: { channel: { select: { id: true, name: true } } },
    });

    const groupIds = memberships.map((member) => member.channel.id);
    const groupNameMap = new Map(
      memberships.map((member) => [member.channel.id, member.channel.name]),
    );

    return { communitySlugs, communityNameMap, groupIds, groupNameMap };
  }

  private encodeCursor(item: { createdAt: Date; id: string }): string {
    return Buffer.from(
      JSON.stringify({ t: item.createdAt.toISOString(), id: item.id }),
    ).toString('base64');
  }

  private decodeCursor(cursor?: string): { t: Date; id: string } | null {
    if (!cursor) {
      return null;
    }

    try {
      const raw = JSON.parse(
        Buffer.from(cursor, 'base64').toString('utf8'),
      ) as { t: string; id: string };
      const t = new Date(raw.t);

      if (Number.isNaN(t.getTime()) || typeof raw.id !== 'string') {
        throw new Error('cursor malformado');
      }

      return { t, id: raw.id };
    } catch {
      throw new BadRequestException('Cursor invalido');
    }
  }

  /**
   * Feed unificado del usuario: mezcla posts de community (general + rubro) y de
   * grupos con membresia aceptada, ordenado por fecha de creacion descendente
   * (mas nuevo primero). Solo posts disponibles: publicados y no eliminados.
   * Paginacion por cursor (keyset) sobre (createdAt, id).
   */
  async getFeed(userId: string, cursor: string | undefined, limit: number) {
    const scopes = await this.getAccessibleScopes(userId);
    const decoded = this.decodeCursor(cursor);

    const cursorWhere = decoded
      ? {
          OR: [
            { createdAt: { lt: decoded.t } },
            { createdAt: decoded.t, id: { lt: decoded.id } },
          ],
        }
      : {};

    // Traemos limit + 1 de cada tabla: alcanza para armar el top-N global exacto
    // (ningun item mas alla de la posicion limit+1 de una tabla puede entrar).
    const take = limit + 1;
    const orderBy = [
      { createdAt: 'desc' as const },
      { id: 'desc' as const },
    ];

    const [communityPosts, channelPosts] = await Promise.all([
      scopes.communitySlugs.length === 0
        ? []
        : this.prisma.communityPost.findMany({
            where: {
              channelSlug: { in: scopes.communitySlugs },
              deletedAt: null,
              status: PostStatus.published,
              ...cursorWhere,
            },
            orderBy,
            take,
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
      scopes.groupIds.length === 0
        ? []
        : this.prisma.communityChannelPost.findMany({
            where: {
              channelId: { in: scopes.groupIds },
              deletedAt: null,
              status: PostStatus.published,
              ...cursorWhere,
            },
            orderBy,
            take,
            include: {
              _count: { select: { comments: { where: { deletedAt: null } } } },
            },
          }),
    ]);

    // CommunityChannelPost no tiene relacion user en el schema: resolvemos autor
    // manualmente (mismo patron que CommunityChannelsService).
    const channelUserIds = [...new Set(channelPosts.map((post) => post.userId))];
    const channelUsers =
      channelUserIds.length === 0
        ? []
        : await this.prisma.user.findMany({
            where: { id: { in: channelUserIds } },
            select: {
              id: true,
              email: true,
              profile: { select: { name: true } },
            },
          });
    const channelUserMap = new Map(
      channelUsers.map((user) => [user.id, user]),
    );

    const communityItems = communityPosts.map((post) => ({
      id: post.id,
      type: 'community' as const,
      channelSlug: post.channelSlug,
      channelId: null as string | null,
      channelName:
        scopes.communityNameMap.get(post.channelSlug) ?? post.channelSlug,
      content: post.content,
      status: post.status,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,
      author: {
        userId: post.userId,
        name: post.user?.profile?.name ?? post.user?.email ?? '',
        email: post.user?.email ?? '',
      },
      commentCount: post._count.comments,
    }));

    const channelItems = channelPosts.map((post) => {
      const user = channelUserMap.get(post.userId);
      const email = user?.email ?? '';

      return {
        id: post.id,
        type: 'channel' as const,
        channelSlug: null as string | null,
        channelId: post.channelId,
        channelName: scopes.groupNameMap.get(post.channelId) ?? '',
        content: post.content,
        status: post.status,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
        author: {
          userId: post.userId,
          name: user?.profile?.name ?? email,
          email,
        },
        commentCount: post._count.comments,
      };
    });

    const merged = [...communityItems, ...channelItems].sort((a, b) => {
      const diff = b.createdAt.getTime() - a.createdAt.getTime();
      if (diff !== 0) {
        return diff;
      }
      // desempate por id descendente (orden total estable)
      return a.id < b.id ? 1 : a.id > b.id ? -1 : 0;
    });

    const hasMore = merged.length > limit;
    const data = merged.slice(0, limit);
    const last = data[data.length - 1];
    const nextCursor = hasMore && last ? this.encodeCursor(last) : null;

    return { data, nextCursor, hasMore };
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
   * Edita el contenido de un post. Solo el creador o un admin.
   */
  async updatePostContent(
    userId: string,
    roles: UserRolePayload[],
    postId: string,
    content: string,
  ) {
    const post = await this.prisma.communityPost.findUnique({
      where: { id: postId },
    });

    if (!post || post.deletedAt) {
      throw new NotFoundException('Post no encontrado');
    }

    if (post.userId !== userId && !this.isAdmin(roles)) {
      throw new ForbiddenException(
        'Solo el creador del post o un admin pueden editarlo',
      );
    }

    return this.prisma.communityPost.update({
      where: { id: postId },
      data: { content: sanitizeMarkdown(content) },
    });
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
