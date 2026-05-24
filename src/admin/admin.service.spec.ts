import { NotFoundException } from '@nestjs/common';
import { AdminService } from './admin.service';

describe('AdminService soft-delete management', () => {
  const prisma = {
    user: {
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    professionalProfile: {
      updateMany: jest.fn(),
    },
    $transaction: jest.fn(),
  } as any;

  const mailService = {} as any;
  const configService = {} as any;

  let service: AdminService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AdminService(prisma, mailService, configService);
  });

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
