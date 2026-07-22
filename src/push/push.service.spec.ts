import { PushService } from './push.service';

describe('PushService', () => {
  const prisma = {
    pushSubscription: {
      upsert: jest.fn(),
      deleteMany: jest.fn(),
    },
  };

  let service: PushService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PushService(prisma as any);
  });

  it('upsert por (provider, subscriptionId) usando el default onesignal', async () => {
    const record = { id: 'sub-1' };
    prisma.pushSubscription.upsert.mockResolvedValue(record);

    const res = await service.registerSubscription('user-1', {
      subscriptionId: 'uuid-abc',
    });

    expect(prisma.pushSubscription.upsert).toHaveBeenCalledWith({
      where: {
        provider_subscriptionId: {
          provider: 'onesignal',
          subscriptionId: 'uuid-abc',
        },
      },
      update: { userId: 'user-1' },
      create: {
        userId: 'user-1',
        provider: 'onesignal',
        subscriptionId: 'uuid-abc',
      },
    });
    expect(res).toBe(record);
  });

  it('respeta el provider explicito', async () => {
    prisma.pushSubscription.upsert.mockResolvedValue({});

    await service.registerSubscription('user-1', {
      subscriptionId: 'uuid-fcm',
      provider: 'fcm',
    });

    expect(prisma.pushSubscription.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          provider_subscriptionId: {
            provider: 'fcm',
            subscriptionId: 'uuid-fcm',
          },
        },
        create: expect.objectContaining({ provider: 'fcm' }),
      }),
    );
  });

  it('reasigna el UUID al usuario actual (update setea userId)', async () => {
    prisma.pushSubscription.upsert.mockResolvedValue({});

    await service.registerSubscription('nuevo-user', {
      subscriptionId: 'uuid-compartido',
    });

    expect(prisma.pushSubscription.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: { userId: 'nuevo-user' },
      }),
    );
  });

  describe('deleteSubscription', () => {
    it('borra scopeado al userId + subscriptionId + provider default', async () => {
      prisma.pushSubscription.deleteMany.mockResolvedValue({ count: 1 });

      const res = await service.deleteSubscription('user-1', 'uuid-abc');

      expect(prisma.pushSubscription.deleteMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          subscriptionId: 'uuid-abc',
          provider: 'onesignal',
        },
      });
      expect(res).toEqual({ ok: true, deleted: 1 });
    });

    it('respeta el provider explicito', async () => {
      prisma.pushSubscription.deleteMany.mockResolvedValue({ count: 1 });

      await service.deleteSubscription('user-1', 'uuid-fcm', 'fcm');

      expect(prisma.pushSubscription.deleteMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ provider: 'fcm' }) }),
      );
    });

    it('es idempotente: deleted 0 si no existia', async () => {
      prisma.pushSubscription.deleteMany.mockResolvedValue({ count: 0 });

      const res = await service.deleteSubscription('user-1', 'inexistente');

      expect(res).toEqual({ ok: true, deleted: 0 });
    });
  });
});
