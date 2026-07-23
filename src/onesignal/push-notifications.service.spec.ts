import { NotifSourceType } from '@prisma/client';
import { PushNotificationsService } from './push-notifications.service';

describe('PushNotificationsService.notifyNewChannelPost', () => {
  const prisma = {
    communityChannel: { findUnique: jest.fn() },
    communityChannelMember: { findMany: jest.fn() },
    notificationPreference: { findMany: jest.fn() },
    pushSubscription: { findMany: jest.fn() },
  };

  const oneSignal = { sendToSubscriptions: jest.fn() };

  let service: PushNotificationsService;

  const baseParams = {
    channelId: 'ch-1',
    postId: 'post-1',
    authorId: 'author-1',
    content: 'Hola grupo',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PushNotificationsService(prisma as any, oneSignal as any);

    prisma.communityChannel.findUnique.mockResolvedValue({
      id: 'ch-1',
      name: 'Grupo Uno',
      isActive: true,
    });
    prisma.communityChannelMember.findMany.mockResolvedValue([
      { userId: 'u-2' },
      { userId: 'u-3' },
    ]);
    prisma.notificationPreference.findMany.mockResolvedValue([]);
    prisma.pushSubscription.findMany.mockResolvedValue([
      { subscriptionId: 'sub-2' },
      { subscriptionId: 'sub-3' },
    ]);
  });

  it('envia a los miembros aceptados con push habilitado', async () => {
    await service.notifyNewChannelPost(baseParams);

    // excluye al autor en la query de miembros
    expect(prisma.communityChannelMember.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          channelId: 'ch-1',
          accepted: true,
          userId: { not: 'author-1' },
        }),
      }),
    );

    expect(oneSignal.sendToSubscriptions).toHaveBeenCalledWith(
      expect.objectContaining({
        subscriptionIds: ['sub-2', 'sub-3'],
        title: 'Grupo Uno',
        message: 'Hola grupo',
        data: { type: 'channel', channelId: 'ch-1', postId: 'post-1' },
      }),
    );
  });

  it('excluye a los que silenciaron el push del canal (opt-out)', async () => {
    prisma.notificationPreference.findMany.mockResolvedValue([{ userId: 'u-2' }]);
    prisma.pushSubscription.findMany.mockResolvedValue([
      { subscriptionId: 'sub-3' },
    ]);

    await service.notifyNewChannelPost(baseParams);

    expect(prisma.notificationPreference.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          sourceType: NotifSourceType.channel,
          sourceId: 'ch-1',
          push: false,
        }),
      }),
    );
    // solo u-3 queda como destinatario -> se piden sus subs
    expect(prisma.pushSubscription.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: { in: ['u-3'] } }),
      }),
    );
  });

  it('no envia si el canal no existe o esta inactivo', async () => {
    prisma.communityChannel.findUnique.mockResolvedValue(null);
    await service.notifyNewChannelPost(baseParams);
    expect(oneSignal.sendToSubscriptions).not.toHaveBeenCalled();

    prisma.communityChannel.findUnique.mockResolvedValue({
      id: 'ch-1',
      name: 'x',
      isActive: false,
    });
    await service.notifyNewChannelPost(baseParams);
    expect(oneSignal.sendToSubscriptions).not.toHaveBeenCalled();
  });

  it('no envia si no hay miembros (aparte del autor)', async () => {
    prisma.communityChannelMember.findMany.mockResolvedValue([]);
    await service.notifyNewChannelPost(baseParams);
    expect(oneSignal.sendToSubscriptions).not.toHaveBeenCalled();
  });

  it('no envia si todos silenciaron el push', async () => {
    prisma.notificationPreference.findMany.mockResolvedValue([
      { userId: 'u-2' },
      { userId: 'u-3' },
    ]);
    await service.notifyNewChannelPost(baseParams);
    expect(oneSignal.sendToSubscriptions).not.toHaveBeenCalled();
  });

  it('no envia si los destinatarios no tienen subscriptions', async () => {
    prisma.pushSubscription.findMany.mockResolvedValue([]);
    await service.notifyNewChannelPost(baseParams);
    expect(oneSignal.sendToSubscriptions).not.toHaveBeenCalled();
  });

  it('no propaga errores (fire-and-forget)', async () => {
    prisma.communityChannel.findUnique.mockRejectedValue(new Error('db down'));
    await expect(service.notifyNewChannelPost(baseParams)).resolves.toBeUndefined();
  });
});
