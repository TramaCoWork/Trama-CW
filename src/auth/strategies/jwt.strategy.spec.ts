import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy soft-delete', () => {
  const prisma = {
    user: {
      findUnique: jest.fn(),
    },
  } as any;

  let strategy: JwtStrategy;

  beforeEach(() => {
    jest.clearAllMocks();
    strategy = new JwtStrategy(prisma);
  });

  it('rejects soft-deleted user payload', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(
      strategy.validate({ sub: 'deleted-id', email: 'd@test.com', role: 'professional' as any }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
