import { NotifSourceType } from '@prisma/client';
import { NotificationsService } from './notifications.service';

describe('NotificationsService', () => {
  const prisma = {
    notificationPreference: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      upsert: jest.fn(),
      deleteMany: jest.fn(),
    },
  };

  let service: NotificationsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new NotificationsService(prisma as any);
  });

  describe('deletePreference', () => {
    it('devuelve { ok, deleted } con el count borrado', async () => {
      prisma.notificationPreference.deleteMany.mockResolvedValue({ count: 1 });

      const res = await service.deletePreference(
        'user-1',
        'general',
        NotifSourceType.community,
      );

      expect(prisma.notificationPreference.deleteMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-1',
          sourceId: 'general',
          sourceType: NotifSourceType.community,
        },
      });
      expect(res).toEqual({ ok: true, deleted: 1 });
    });

    it('es idempotente: devuelve deleted 0 si no existia el registro', async () => {
      prisma.notificationPreference.deleteMany.mockResolvedValue({ count: 0 });

      const res = await service.deletePreference(
        'user-1',
        'group-1',
        NotifSourceType.channel,
      );

      expect(res).toEqual({ ok: true, deleted: 0 });
    });
  });

  describe('upsertPreference', () => {
    it('upsert con email/push explicitos', async () => {
      const record = { id: 'p1' };
      prisma.notificationPreference.upsert.mockResolvedValue(record);

      const res = await service.upsertPreference('user-1', {
        sourceId: 'general',
        sourceType: NotifSourceType.community,
        email: false,
        push: true,
      });

      expect(prisma.notificationPreference.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: { email: false, push: true },
          create: expect.objectContaining({ email: false, push: true }),
        }),
      );
      expect(res).toBe(record);
    });

    it('defaultea email/push a true cuando vienen undefined', async () => {
      prisma.notificationPreference.upsert.mockResolvedValue({});

      await service.upsertPreference('user-1', {
        sourceId: 'general',
        sourceType: NotifSourceType.community,
      });

      expect(prisma.notificationPreference.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: { email: true, push: true },
        }),
      );
    });
  });

  describe('getPreference', () => {
    it('devuelve defaults true cuando no hay registro (opt-out)', async () => {
      prisma.notificationPreference.findUnique.mockResolvedValue(null);

      const res = await service.getPreference(
        'user-1',
        'general',
        NotifSourceType.community,
      );

      expect(res).toEqual({ email: true, push: true });
    });

    it('refleja el registro guardado', async () => {
      prisma.notificationPreference.findUnique.mockResolvedValue({
        email: false,
        push: true,
      });

      const res = await service.getPreference(
        'user-1',
        'general',
        NotifSourceType.community,
      );

      expect(res).toEqual({ email: false, push: true });
    });
  });
});
