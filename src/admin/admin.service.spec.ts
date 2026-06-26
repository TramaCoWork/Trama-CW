import { NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AdminService } from './admin.service';

describe('AdminService', () => {
  const prisma = {
    user: {
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    professionalProfile: {
      findUnique: jest.fn(),
      updateMany: jest.fn(),
    },
    $transaction: jest.fn(),
  } as any;

  const mailService = {} as any;
  const configService = {} as any;
  const authService = {} as any;
  const mercadopago = {} as any;
  const storage = { delete: jest.fn() } as any;

  let service: AdminService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AdminService(prisma, mailService, configService, authService, mercadopago, storage);
  });

  describe('soft-delete management', () => {
    it('lists only soft-deleted users', async () => {
      prisma.user.findMany.mockResolvedValue([
        { id: 'u1', email: 'u1@test.com', deletedAt: new Date(), role: 'professional' },
      ]);
      prisma.user.count.mockResolvedValue(1);

      const rows = await service.listSoftDeletedUsers(0, 10);

      expect(rows.data).toHaveLength(1);
      expect(prisma.user.findMany).toHaveBeenCalled();
    });

    it('restores soft-deleted user and profile atomically', async () => {
      prisma.user.findFirst.mockResolvedValue({ id: 'u1', deletedAt: new Date() });
      prisma.user.update.mockResolvedValue({ id: 'u1', deletedAt: null });
      prisma.professionalProfile.updateMany.mockResolvedValue({ count: 1 });
      prisma.$transaction.mockImplementation(async (ops: Promise<unknown>[]) => Promise.all(ops));

      const restored = await service.restoreSoftDeletedUser('u1');

      expect(restored).toHaveProperty('deletedAt', null);
    });

    it('fails restoring non-deleted user', async () => {
      prisma.user.findFirst.mockResolvedValue(null);

      await expect(service.restoreSoftDeletedUser('missing')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('changeProfessionalPassword', () => {
    it('hashes password with 10 rounds and updates user passwordHash', async () => {
      const hashSpy = jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashed-password' as never);
      prisma.professionalProfile.findUnique.mockResolvedValue({ id: 'profile-1', userId: 'user-1' });
      prisma.user.update.mockResolvedValue({ id: 'user-1' });

      const result = await service.changeProfessionalPassword('profile-1', 'newPassword123');

      expect(hashSpy).toHaveBeenCalledWith('newPassword123', 10);
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { passwordHash: 'hashed-password' },
        }),
      );
      expect(result).toEqual({ message: 'Password updated' });
    });

    it('throws NotFoundException when professional profile does not exist', async () => {
      prisma.professionalProfile.findUnique.mockResolvedValue(null);

      await expect(service.changeProfessionalPassword('missing-profile', 'newPassword123')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('propagates persistence failure without swallowing error', async () => {
      const hashSpy = jest.spyOn(bcrypt, 'hash').mockResolvedValue('hashed-password' as never);
      const persistenceError = new Error('db write failed');
      prisma.professionalProfile.findUnique.mockResolvedValue({ id: 'profile-1', userId: 'user-1' });
      prisma.user.update.mockRejectedValue(persistenceError);

      await expect(service.changeProfessionalPassword('profile-1', 'newPassword123')).rejects.toThrow('db write failed');
      expect(hashSpy).toHaveBeenCalledWith('newPassword123', 10);
    });
  });
});
