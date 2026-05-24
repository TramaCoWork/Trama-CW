import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

describe('AuthService soft-delete', () => {
  const prisma = {
    user: {
      findUnique: jest.fn(),
    },
    professionalProfile: {
      findUnique: jest.fn(),
    },
  } as any;

  const jwtService = {} as any;
  const mailService = {} as any;
  const configService = { get: jest.fn().mockReturnValue('http://localhost:4321') } as any;

  let service: AuthService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AuthService(prisma, jwtService, mailService, configService);
  });

  it('rejects login for soft-deleted users', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(
      service.login({ email: 'deleted@test.com', password: 'password123' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
