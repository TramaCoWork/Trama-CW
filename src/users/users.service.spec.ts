import { NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service';

describe('UsersService soft-delete', () => {
  const prisma = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    professionalProfile: {
      updateMany: jest.fn(),
    },
    $transaction: jest.fn(),
  } as any;

  let service: UsersService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new UsersService(prisma);
  });

  it('soft-deletes user and profile atomically', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'user-id' });
    prisma.user.update.mockResolvedValue({ id: 'user-id', deletedAt: new Date() });
    prisma.professionalProfile.updateMany.mockResolvedValue({ count: 1 });
    prisma.$transaction.mockImplementation(async (ops: Promise<unknown>[]) => Promise.all(ops));

    const result = await service.softDeleteUser('user-id');

    expect(result).toHaveProperty('id', 'user-id');
    expect(prisma.professionalProfile.updateMany).toHaveBeenCalled();
  });

  it('throws when user is already deleted or missing', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(service.softDeleteUser('missing-id')).rejects.toBeInstanceOf(NotFoundException);
  });
});
