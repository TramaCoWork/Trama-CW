import { CommunityDigestPushCronService } from './community-digest-push-cron.service';

describe('CommunityDigestPushCronService.handleCommunityDigestPush', () => {
  const prisma = {
    professionalProfile: { findMany: jest.fn() },
    notificationPreference: { findMany: jest.fn() },
    communityLastSeen: { findMany: jest.fn(), upsert: jest.fn() },
    communityPost: { count: jest.fn() },
    pushSubscription: { findMany: jest.fn() },
  };
  const oneSignal = { sendToSubscriptions: jest.fn() };

  let service: CommunityDigestPushCronService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CommunityDigestPushCronService(
      prisma as any,
      {} as any,
      {} as any,
      oneSignal as any,
    );

    // Un profesional con rubro "plomeria".
    prisma.professionalProfile.findMany.mockResolvedValue([
      { userId: 'u-1', rubro: { slug: 'plomeria', name: 'Plomería' } },
    ]);
    prisma.notificationPreference.findMany.mockResolvedValue([]);
    prisma.communityLastSeen.findMany.mockResolvedValue([]);
    prisma.pushSubscription.findMany.mockResolvedValue([
      { subscriptionId: 'sub-1' },
    ]);
    prisma.communityLastSeen.upsert.mockResolvedValue({});
  });

  it('envia digest y avanza lastPushNotifiedAt cuando hay posts nuevos', async () => {
    // general: 2 nuevos, plomeria: 0
    prisma.communityPost.count
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(0);

    const result = await service.handleCommunityDigestPush();

    expect(oneSignal.sendToSubscriptions).toHaveBeenCalledWith(
      expect.objectContaining({
        subscriptionIds: ['sub-1'],
        title: 'General',
        message: 'Tenés 2 nuevos posts en General',
      }),
    );
    // marca solo el canal con novedades
    expect(prisma.communityLastSeen.upsert).toHaveBeenCalledTimes(1);
    expect(prisma.communityLastSeen.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId_channelSlug: { userId: 'u-1', channelSlug: 'general' } },
        update: { lastPushNotifiedAt: expect.any(Date) },
      }),
    );
    expect(result.processedCount).toBe(1);
  });

  it('agrupa varios canales en un solo push', async () => {
    prisma.communityPost.count
      .mockResolvedValueOnce(2) // general
      .mockResolvedValueOnce(3); // plomeria

    await service.handleCommunityDigestPush();

    expect(oneSignal.sendToSubscriptions).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Comunidad Trama',
        message: 'Tenés novedades en General (2), Plomería (3)',
      }),
    );
    expect(prisma.communityLastSeen.upsert).toHaveBeenCalledTimes(2);
  });

  it('no notifica canales con push silenciado (opt-out)', async () => {
    prisma.notificationPreference.findMany.mockResolvedValue([
      { sourceId: 'general', push: false },
    ]);
    // solo se deberia contar plomeria
    prisma.communityPost.count.mockResolvedValue(5);

    await service.handleCommunityDigestPush();

    // count llamado una sola vez (general se saltea antes de contar)
    expect(prisma.communityPost.count).toHaveBeenCalledTimes(1);
    expect(oneSignal.sendToSubscriptions).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Plomería' }),
    );
  });

  it('no envia si no hay posts nuevos', async () => {
    prisma.communityPost.count.mockResolvedValue(0);

    const result = await service.handleCommunityDigestPush();

    expect(oneSignal.sendToSubscriptions).not.toHaveBeenCalled();
    expect(prisma.communityLastSeen.upsert).not.toHaveBeenCalled();
    expect(result.processedCount).toBe(0);
  });

  it('no envia (ni marca) si el usuario no tiene subscriptions', async () => {
    prisma.communityPost.count.mockResolvedValue(2);
    prisma.pushSubscription.findMany.mockResolvedValue([]);

    const result = await service.handleCommunityDigestPush();

    expect(oneSignal.sendToSubscriptions).not.toHaveBeenCalled();
    expect(prisma.communityLastSeen.upsert).not.toHaveBeenCalled();
    expect(result.processedCount).toBe(0);
  });

  it('usa el watermark: cuenta posts posteriores a lastPushNotifiedAt', async () => {
    const lastPush = new Date('2026-07-22T10:00:00.000Z');
    prisma.communityLastSeen.findMany.mockResolvedValue([
      {
        channelSlug: 'general',
        lastSeenAt: new Date('2026-07-01T00:00:00.000Z'),
        lastPushNotifiedAt: lastPush,
      },
    ]);
    prisma.communityPost.count.mockResolvedValue(0);

    await service.handleCommunityDigestPush();

    // para "general" el gt debe ser el mayor: lastPushNotifiedAt
    const generalCall = prisma.communityPost.count.mock.calls.find(
      (call) => call[0].where.channelSlug === 'general',
    );
    expect(generalCall[0].where.createdAt).toEqual({ gt: lastPush });
  });
});
