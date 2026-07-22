import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { PostStatus } from '@prisma/client';
import { CommunityChannelsService } from './community-channels.service';

describe('CommunityChannelsService (gestion de posts)', () => {
  const prisma = {
    communityChannelPost: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };

  let service: CommunityChannelsService;

  const ownerRoles = [{ name: 'professional', type: 'professional' }];
  const adminRoles = [{ name: 'admin', type: 'admin' }];

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CommunityChannelsService(prisma as any);
  });

  describe('updatePostStatus', () => {
    it('actualiza el estado cuando el que llama es el owner', async () => {
      prisma.communityChannelPost.findFirst.mockResolvedValue({
        id: 'post-1',
        channelId: 'ch-1',
        userId: 'owner-1',
      });
      prisma.communityChannelPost.update.mockResolvedValue({
        id: 'post-1',
        status: PostStatus.paused,
      });

      const res = await service.updatePostStatus(
        'ch-1',
        'post-1',
        'owner-1',
        PostStatus.paused,
      );

      expect(prisma.communityChannelPost.update).toHaveBeenCalledWith({
        where: { id: 'post-1' },
        data: { status: PostStatus.paused },
      });
      expect(res).toEqual({ id: 'post-1', status: PostStatus.paused });
    });

    it('404 si el post no existe / no esta en el canal', async () => {
      prisma.communityChannelPost.findFirst.mockResolvedValue(null);

      await expect(
        service.updatePostStatus('ch-1', 'post-x', 'owner-1', PostStatus.paused),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.communityChannelPost.update).not.toHaveBeenCalled();
    });

    it('403 si el que llama no es el owner (ni siquiera admin puede)', async () => {
      prisma.communityChannelPost.findFirst.mockResolvedValue({
        id: 'post-1',
        channelId: 'ch-1',
        userId: 'owner-1',
      });

      await expect(
        service.updatePostStatus('ch-1', 'post-1', 'otro', PostStatus.paused),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('deletePost', () => {
    it('el owner puede borrar (soft delete)', async () => {
      prisma.communityChannelPost.findFirst.mockResolvedValue({
        id: 'post-1',
        channelId: 'ch-1',
        userId: 'owner-1',
      });
      prisma.communityChannelPost.update.mockResolvedValue({ id: 'post-1' });

      await service.deletePost('ch-1', 'post-1', 'owner-1', ownerRoles);

      expect(prisma.communityChannelPost.update).toHaveBeenCalledWith({
        where: { id: 'post-1' },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it('un admin puede borrar un post ajeno', async () => {
      prisma.communityChannelPost.findFirst.mockResolvedValue({
        id: 'post-1',
        channelId: 'ch-1',
        userId: 'owner-1',
      });
      prisma.communityChannelPost.update.mockResolvedValue({ id: 'post-1' });

      await service.deletePost('ch-1', 'post-1', 'admin-user', adminRoles);

      expect(prisma.communityChannelPost.update).toHaveBeenCalled();
    });

    it('403 si no es owner ni admin', async () => {
      prisma.communityChannelPost.findFirst.mockResolvedValue({
        id: 'post-1',
        channelId: 'ch-1',
        userId: 'owner-1',
      });

      await expect(
        service.deletePost('ch-1', 'post-1', 'otro', ownerRoles),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.communityChannelPost.update).not.toHaveBeenCalled();
    });

    it('404 si el post no existe', async () => {
      prisma.communityChannelPost.findFirst.mockResolvedValue(null);

      await expect(
        service.deletePost('ch-1', 'post-x', 'owner-1', ownerRoles),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
