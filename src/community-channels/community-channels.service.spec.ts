import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { PostStatus } from '@prisma/client';
import { CommunityChannelsService } from './community-channels.service';

describe('CommunityChannelsService (gestion de posts)', () => {
  const prisma = {
    communityChannelPost: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    communityChannelComment: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findMany: jest.fn(),
    },
  };

  let service: CommunityChannelsService;

  const ownerRoles = [{ name: 'professional', type: 'professional' }];
  const adminRoles = [{ name: 'admin', type: 'admin' }];

  const pushNotifications = { notifyNewChannelPost: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CommunityChannelsService(
      prisma as any,
      pushNotifications as any,
    );
  });

  describe('getChannelPosts', () => {
    it('incluye commentCount por post (comentarios no borrados)', async () => {
      prisma.communityChannelPost.findMany.mockResolvedValue([
        {
          id: 'post-1',
          channelId: 'ch-1',
          userId: 'u-1',
          content: 'hola',
          _count: { comments: 3 },
        },
      ]);
      prisma.communityChannelPost.count.mockResolvedValue(1);
      prisma.user.findMany.mockResolvedValue([
        { id: 'u-1', email: 'a@x.com', profile: { id: 'p-1', name: 'Ana', photo: null } },
      ]);

      const res = await service.getChannelPosts('ch-1', 1, 20);

      expect(prisma.communityChannelPost.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: {
            _count: { select: { comments: { where: { deletedAt: null } } } },
          },
        }),
      );
      expect(res.data[0]).toMatchObject({
        id: 'post-1',
        commentCount: 3,
        nombre: 'Ana',
      });
      // no filtra el _count crudo
      expect(res.data[0]).not.toHaveProperty('_count');
    });
  });

  describe('getPost', () => {
    it('incluye commentCount en el detalle', async () => {
      prisma.communityChannelPost.findFirst.mockResolvedValue({
        id: 'post-1',
        channelId: 'ch-1',
        userId: 'u-1',
        content: 'hola',
        _count: { comments: 5 },
      });

      const res = await service.getPost('ch-1', 'post-1');

      expect(res).toMatchObject({ id: 'post-1', commentCount: 5 });
      expect(res).not.toHaveProperty('_count');
    });
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

  describe('updatePostContent', () => {
    it('el owner edita el contenido (sanitizado)', async () => {
      prisma.communityChannelPost.findFirst.mockResolvedValue({
        id: 'post-1',
        channelId: 'ch-1',
        userId: 'owner-1',
      });
      prisma.communityChannelPost.update.mockResolvedValue({ id: 'post-1' });

      await service.updatePostContent(
        'ch-1',
        'post-1',
        'owner-1',
        ownerRoles,
        'nuevo contenido',
      );

      expect(prisma.communityChannelPost.update).toHaveBeenCalledWith({
        where: { id: 'post-1' },
        data: { content: 'nuevo contenido' },
      });
    });

    it('un admin puede editar un post ajeno', async () => {
      prisma.communityChannelPost.findFirst.mockResolvedValue({
        id: 'post-1',
        channelId: 'ch-1',
        userId: 'owner-1',
      });
      prisma.communityChannelPost.update.mockResolvedValue({ id: 'post-1' });

      await service.updatePostContent(
        'ch-1',
        'post-1',
        'admin-user',
        adminRoles,
        'editado por admin',
      );

      expect(prisma.communityChannelPost.update).toHaveBeenCalled();
    });

    it('403 si no es owner ni admin', async () => {
      prisma.communityChannelPost.findFirst.mockResolvedValue({
        id: 'post-1',
        channelId: 'ch-1',
        userId: 'owner-1',
      });

      await expect(
        service.updatePostContent('ch-1', 'post-1', 'otro', ownerRoles, 'x'),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.communityChannelPost.update).not.toHaveBeenCalled();
    });

    it('404 si el post no existe / no esta en el canal', async () => {
      prisma.communityChannelPost.findFirst.mockResolvedValue(null);

      await expect(
        service.updatePostContent('ch-1', 'post-x', 'owner-1', ownerRoles, 'x'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('deleteComment', () => {
    it('el owner puede borrar su comentario (soft delete)', async () => {
      prisma.communityChannelComment.findFirst.mockResolvedValue({
        id: 'c-1',
        postId: 'post-1',
        userId: 'owner-1',
      });
      prisma.communityChannelComment.update.mockResolvedValue({ id: 'c-1' });

      await service.deleteComment('ch-1', 'post-1', 'c-1', 'owner-1', ownerRoles);

      expect(prisma.communityChannelComment.update).toHaveBeenCalledWith({
        where: { id: 'c-1' },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it('un admin puede borrar un comentario ajeno', async () => {
      prisma.communityChannelComment.findFirst.mockResolvedValue({
        id: 'c-1',
        postId: 'post-1',
        userId: 'owner-1',
      });
      prisma.communityChannelComment.update.mockResolvedValue({ id: 'c-1' });

      await service.deleteComment('ch-1', 'post-1', 'c-1', 'admin-user', adminRoles);

      expect(prisma.communityChannelComment.update).toHaveBeenCalled();
    });

    it('403 si no es owner ni admin', async () => {
      prisma.communityChannelComment.findFirst.mockResolvedValue({
        id: 'c-1',
        postId: 'post-1',
        userId: 'owner-1',
      });

      await expect(
        service.deleteComment('ch-1', 'post-1', 'c-1', 'otro', ownerRoles),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.communityChannelComment.update).not.toHaveBeenCalled();
    });

    it('404 si el comentario no existe / no pertenece al post o canal', async () => {
      prisma.communityChannelComment.findFirst.mockResolvedValue(null);

      await expect(
        service.deleteComment('ch-1', 'post-1', 'c-x', 'owner-1', ownerRoles),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
