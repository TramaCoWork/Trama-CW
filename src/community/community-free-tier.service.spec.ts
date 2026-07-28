import { ForbiddenException } from '@nestjs/common';
import { CommunityService } from './community.service';

describe('CommunityService — restricciones plan gratuito', () => {
  const prisma = {
    professionalProfile: { findUnique: jest.fn() },
    communityChannelMember: { findMany: jest.fn() },
    communityPost: { findMany: jest.fn(), count: jest.fn() },
    communityLastSeen: { findMany: jest.fn() },
  };
  const entitlements = { isPaid: jest.fn() };
  const configService = {
    get: jest.fn((_key: string, def: unknown) => def),
  };

  let service: CommunityService;

  const proRoles = [{ name: 'professional', type: 'professional' }];

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CommunityService(
      prisma as any,
      entitlements as any,
      configService as any,
    );
  });

  describe('checkChannelAccess', () => {
    it('free: general permitido', async () => {
      entitlements.isPaid.mockResolvedValue(false);
      await expect(
        service.checkChannelAccess('u-1', proRoles, 'general'),
      ).resolves.toBeUndefined();
    });

    it('free: canal de rubro bloqueado (403)', async () => {
      entitlements.isPaid.mockResolvedValue(false);
      await expect(
        service.checkChannelAccess('u-1', proRoles, 'abogacia'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('paid: canal de rubro permitido si coincide', async () => {
      entitlements.isPaid.mockResolvedValue(true);
      prisma.professionalProfile.findUnique.mockResolvedValue({
        rubro: { slug: 'abogacia' },
      });
      await expect(
        service.checkChannelAccess('u-1', proRoles, 'abogacia'),
      ).resolves.toBeUndefined();
    });
  });

  describe('getChannelPosts (free cap)', () => {
    it('free: topeado a FREE_TIER_VISIBLE_POSTS (default 5), pagina 1', async () => {
      entitlements.isPaid.mockResolvedValue(false);
      prisma.communityPost.findMany.mockResolvedValue([]);
      prisma.communityPost.count.mockResolvedValue(50);

      const res = await service.getChannelPosts('u-1', proRoles, 'general', 3, 20);

      // se ignora page/limit del cliente
      const call = prisma.communityPost.findMany.mock.calls[0][0];
      expect(call.take).toBe(5);
      expect(call.skip).toBe(0);
      expect(res.meta).toMatchObject({ page: 1, limit: 5, total: 5, totalPages: 1 });
    });

    it('paid: respeta page/limit y total real', async () => {
      entitlements.isPaid.mockResolvedValue(true);
      prisma.communityPost.findMany.mockResolvedValue([]);
      prisma.communityPost.count.mockResolvedValue(50);

      const res = await service.getChannelPosts('u-1', proRoles, 'general', 2, 20);

      const call = prisma.communityPost.findMany.mock.calls[0][0];
      expect(call.take).toBe(20);
      expect(call.skip).toBe(20);
      expect(res.meta).toMatchObject({ page: 2, limit: 20, total: 50 });
    });
  });

  describe('createPost (free: cuota mensual)', () => {
    const dto = { content: 'hola' } as any;

    it('free: bloquea si ya publico este mes (403)', async () => {
      entitlements.isPaid.mockResolvedValue(false);
      prisma.communityPost.count.mockResolvedValue(1); // ya tiene 1 este mes

      await expect(
        service.createPost('u-1', proRoles, dto),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.communityPost.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: 'u-1',
            deletedAt: null,
            createdAt: expect.objectContaining({ gte: expect.any(Date) }),
          }),
        }),
      );
    });

    it('free: permite si no publico este mes', async () => {
      entitlements.isPaid.mockResolvedValue(false);
      prisma.communityPost.count.mockResolvedValue(0);
      (prisma.communityPost as any).create = jest
        .fn()
        .mockResolvedValue({ id: 'p-1' });

      await expect(service.createPost('u-1', proRoles, dto)).resolves.toEqual({
        id: 'p-1',
      });
    });

    it('paid: no chequea cuota mensual', async () => {
      entitlements.isPaid.mockResolvedValue(true);
      (prisma.communityPost as any).create = jest
        .fn()
        .mockResolvedValue({ id: 'p-2' });

      await service.createPost('u-1', proRoles, dto);
      expect(prisma.communityPost.count).not.toHaveBeenCalled();
    });
  });
});
