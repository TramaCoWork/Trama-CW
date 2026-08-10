import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PostStatus, ReactionTargetType, ReactionType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EntitlementsService } from '../entitlements/entitlements.service';
import { CommunityService } from '../community/community.service';
import { ReactionsQueryService } from './reactions-query.service';
import { withoutDeleted } from '../common/filters/soft-delete.filter';
import type { CurrentUserType } from '../auth/decorators/current-user.decorator';

type UserRolePayload = { name: string; type: string };

@Injectable()
export class ReactionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly entitlements: EntitlementsService,
    private readonly community: CommunityService,
    private readonly query: ReactionsQueryService,
  ) {}

  private isAdmin(roles: UserRolePayload[]): boolean {
    return roles.some((role) => role.type === 'admin' || role.name === 'admin');
  }

  async setReaction(
    targetType: ReactionTargetType,
    targetId: string,
    type: ReactionType,
    user: CurrentUserType,
  ) {
    await this.assertCanAccessTarget(targetType, targetId, user);

    await this.prisma.reaction.upsert({
      where: { userId_targetType_targetId: { userId: user.userId, targetType, targetId } },
      update: { type },
      create: { userId: user.userId, targetType, targetId, type },
    });

    return this.query.getOne(targetType, targetId, user.userId);
  }

  async removeReaction(
    targetType: ReactionTargetType,
    targetId: string,
    user: CurrentUserType,
  ) {
    await this.assertCanAccessTarget(targetType, targetId, user);

    await this.prisma.reaction.deleteMany({
      where: { userId: user.userId, targetType, targetId },
    });

    return this.query.getOne(targetType, targetId, user.userId);
  }

  /**
   * Verifica que el target exista (no borrado) y que el usuario tenga acceso a
   * su canal. Reutiliza CommunityService.checkChannelAccess para los targets de
   * community; para los de grupo replica la regla del ChannelMemberGuard.
   */
  private async assertCanAccessTarget(
    targetType: ReactionTargetType,
    targetId: string,
    user: CurrentUserType,
  ): Promise<void> {
    const notFound = () =>
      new NotFoundException('No se encontró el contenido.');

    switch (targetType) {
      case ReactionTargetType.community_post: {
        const post = await this.prisma.communityPost.findFirst({
          where: withoutDeleted({ id: targetId, status: PostStatus.published }),
          select: { channelSlug: true },
        });
        if (!post) throw notFound();
        await this.community.checkChannelAccess(user.userId, user.roles, post.channelSlug);
        return;
      }
      case ReactionTargetType.community_comment: {
        const comment = await this.prisma.communityComment.findFirst({
          where: withoutDeleted({ id: targetId }),
          select: { post: { select: { channelSlug: true, deletedAt: true, status: true } } },
        });
        if (!comment || comment.post.deletedAt || comment.post.status !== PostStatus.published)
          throw notFound();
        await this.community.checkChannelAccess(
          user.userId, user.roles, comment.post.channelSlug,
        );
        return;
      }
      case ReactionTargetType.community_channel_post: {
        const post = await this.prisma.communityChannelPost.findFirst({
          where: withoutDeleted({ id: targetId, status: PostStatus.published }),
          select: { channelId: true },
        });
        if (!post) throw notFound();
        await this.assertChannelMember(post.channelId, user);
        return;
      }
      case ReactionTargetType.community_channel_comment: {
        const comment = await this.prisma.communityChannelComment.findFirst({
          where: withoutDeleted({ id: targetId }),
          select: { post: { select: { channelId: true, deletedAt: true, status: true } } },
        });
        if (!comment || comment.post.deletedAt || comment.post.status !== PostStatus.published)
          throw notFound();
        await this.assertChannelMember(comment.post.channelId, user);
        return;
      }
    }
  }

  /** Mirror de ChannelMemberGuard: admin pasa; el resto requiere plan pago y membresía aceptada. */
  private async assertChannelMember(
    channelId: string,
    user: CurrentUserType,
  ): Promise<void> {
    if (this.isAdmin(user.roles)) return;

    const isPaid = await this.entitlements.isPaid(user.userId);
    if (!isPaid) {
      throw new ForbiddenException(
        'Los grupos son exclusivos del plan pago. Con el plan gratuito solo tenés acceso al canal general.',
      );
    }

    const membership = await this.prisma.communityChannelMember.findUnique({
      where: { channelId_userId: { channelId, userId: user.userId } },
      select: { accepted: true },
    });
    if (!membership?.accepted) {
      throw new ForbiddenException('No autorizado para este canal');
    }
  }
}
