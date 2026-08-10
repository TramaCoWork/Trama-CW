import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ReactionTargetType, ReactionType } from '@prisma/client';
import { ReactionsService } from './reactions.service';

describe('ReactionsService', () => {
  const prisma = {
    communityPost: { findFirst: jest.fn() },
    communityComment: { findFirst: jest.fn() },
    communityChannelPost: { findFirst: jest.fn() },
    communityChannelComment: { findFirst: jest.fn() },
    communityChannelMember: { findUnique: jest.fn() },
    reaction: { upsert: jest.fn(), deleteMany: jest.fn() },
  };
  const entitlements = { isPaid: jest.fn().mockResolvedValue(true) };
  const community = { checkChannelAccess: jest.fn().mockResolvedValue(undefined) };
  const query = {
    getOne: jest.fn().mockResolvedValue({
      reactions: { LIKE: 1, LOVE: 0, LAUGH: 0, WOW: 0, SAD: 0, DISLIKE: 0 },
      myReaction: ReactionType.LIKE,
    }),
  };

  const user = { userId: 'me', roles: [{ name: 'professional', type: 'professional' }] } as any;
  let service: ReactionsService;

  beforeEach(() => {
    jest.clearAllMocks();
    entitlements.isPaid.mockResolvedValue(true);
    community.checkChannelAccess.mockResolvedValue(undefined);
    service = new ReactionsService(
      prisma as any,
      entitlements as any,
      community as any,
      query as any,
    );
  });

  it('setReaction en community_post hace upsert y valida acceso al canal', async () => {
    prisma.communityPost.findFirst.mockResolvedValue({ id: 'p1', channelSlug: 'general' });

    const res = await service.setReaction(
      ReactionTargetType.community_post, 'p1', ReactionType.LIKE, user,
    );

    expect(community.checkChannelAccess).toHaveBeenCalledWith('me', user.roles, 'general');
    expect(prisma.reaction.upsert).toHaveBeenCalledWith({
      where: { userId_targetType_targetId: {
        userId: 'me', targetType: ReactionTargetType.community_post, targetId: 'p1',
      } },
      update: { type: ReactionType.LIKE },
      create: {
        userId: 'me', targetType: ReactionTargetType.community_post,
        targetId: 'p1', type: ReactionType.LIKE,
      },
    });
    expect(res.myReaction).toBe(ReactionType.LIKE);
  });

  it('setReaction lanza 404 si el post no existe', async () => {
    prisma.communityPost.findFirst.mockResolvedValue(null);
    await expect(
      service.setReaction(ReactionTargetType.community_post, 'nope', ReactionType.LIKE, user),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.reaction.upsert).not.toHaveBeenCalled();
  });

  it('removeReaction borra la fila del usuario para ese target', async () => {
    prisma.communityPost.findFirst.mockResolvedValue({ id: 'p1', channelSlug: 'general' });

    await service.removeReaction(ReactionTargetType.community_post, 'p1', user);

    expect(prisma.reaction.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'me', targetType: ReactionTargetType.community_post, targetId: 'p1' },
    });
  });

  it('setReaction en community_channel_post exige membresía aceptada', async () => {
    prisma.communityChannelPost.findFirst.mockResolvedValue({ id: 'cp1', channelId: 'g1' });
    prisma.communityChannelMember.findUnique.mockResolvedValue({ accepted: true });

    await service.setReaction(
      ReactionTargetType.community_channel_post, 'cp1', ReactionType.LOVE, user,
    );

    expect(prisma.communityChannelMember.findUnique).toHaveBeenCalledWith({
      where: { channelId_userId: { channelId: 'g1', userId: 'me' } },
      select: { accepted: true },
    });
    expect(prisma.reaction.upsert).toHaveBeenCalled();
  });

  it('community_comment 404 when parent post is soft-deleted', async () => {
    prisma.communityComment.findFirst.mockResolvedValue({
      post: { channelSlug: 'general', deletedAt: new Date() },
    });

    await expect(
      service.setReaction(ReactionTargetType.community_comment, 'c1', ReactionType.LIKE, user),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.reaction.upsert).not.toHaveBeenCalled();
  });

  it('community_channel_comment 404 when parent channel post is soft-deleted', async () => {
    prisma.communityChannelComment.findFirst.mockResolvedValue({
      post: { channelId: 'g1', deletedAt: new Date() },
    });

    await expect(
      service.setReaction(ReactionTargetType.community_channel_comment, 'cc1', ReactionType.LIKE, user),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.reaction.upsert).not.toHaveBeenCalled();
  });

  it('community_comment 404 when parent post is paused', async () => {
    prisma.communityComment.findFirst.mockResolvedValue({
      post: { channelSlug: 'general', deletedAt: null, status: 'paused' },
    });

    await expect(
      service.setReaction(ReactionTargetType.community_comment, 'c2', ReactionType.LIKE, user),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.reaction.upsert).not.toHaveBeenCalled();
  });

  it('community_channel_comment 404 when parent channel post is paused', async () => {
    prisma.communityChannelComment.findFirst.mockResolvedValue({
      post: { channelId: 'g1', deletedAt: null, status: 'paused' },
    });

    await expect(
      service.setReaction(ReactionTargetType.community_channel_comment, 'cc2', ReactionType.LIKE, user),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.reaction.upsert).not.toHaveBeenCalled();
  });

  it('channel target rejects unpaid non-admin', async () => {
    prisma.communityChannelPost.findFirst.mockResolvedValue({ id: 'cp1', channelId: 'g1' });
    entitlements.isPaid.mockResolvedValue(false);

    await expect(
      service.setReaction(ReactionTargetType.community_channel_post, 'cp1', ReactionType.LOVE, user),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.reaction.upsert).not.toHaveBeenCalled();
  });

  it('removeReaction checks access before deleting', async () => {
    prisma.communityPost.findFirst.mockResolvedValue({ id: 'p1', channelSlug: 'general' });

    await service.removeReaction(ReactionTargetType.community_post, 'p1', user);

    expect(community.checkChannelAccess).toHaveBeenCalledWith('me', user.roles, 'general');
    expect(prisma.reaction.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'me', targetType: ReactionTargetType.community_post, targetId: 'p1' },
    });
  });
});
