jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashed'),
  compare: jest.fn(),
}));

import { BadRequestException, ConflictException } from '@nestjs/common';
import { AuthService } from './auth.service';

describe('AuthService.companyRegister', () => {
  const prisma = {
    user: { findUnique: jest.fn(), create: jest.fn() },
    company: { findFirst: jest.fn() },
    professionCategory: { findFirst: jest.fn() },
    userRole: { findMany: jest.fn() },
  };
  const jwtService = { sign: jest.fn().mockReturnValue('jwt-token') };
  const configService = { get: jest.fn((_k: string, d: unknown) => d) };

  let service: AuthService;

  const dto = {
    email: 'empresa@x.com',
    password: 'secret123',
    name: 'Estudio Norte',
    cuit: '30712345670',
    rubroId: 1,
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AuthService(
      prisma as any,
      jwtService as any,
      {} as any,
      configService as any,
    );
    // Neutralizar el email de verificación (fire-and-forget).
    (service as any).sendVerificationEmail = jest.fn();

    prisma.user.findUnique.mockResolvedValue(null);
    prisma.company.findFirst.mockResolvedValue(null);
    prisma.professionCategory.findFirst.mockResolvedValue({ id: 1, level: 1 });
    prisma.user.create.mockResolvedValue({ id: 'u-1', email: dto.email });
    prisma.userRole.findMany.mockResolvedValue([
      { role: { name: 'company', type: 'company', permissions: [] } },
    ]);
  });

  it('happy path: crea user con company + rol company + accountType company', async () => {
    const res = await service.companyRegister(dto);

    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: dto.email,
          accountType: 'company',
          userRoles: { create: [{ role: { connect: { name: 'company' } } }] },
          company: {
            create: expect.objectContaining({
              name: 'Estudio Norte',
              cuit: '30712345670',
              rubroId: 1,
              status: 'pending_review',
            }),
          },
        }),
      }),
    );
    expect(res).toEqual({ access_token: 'jwt-token', userId: 'u-1' });
  });

  it('email duplicado -> Conflict', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'x' });
    await expect(service.companyRegister(dto)).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('cuit duplicado -> Conflict', async () => {
    prisma.company.findFirst.mockResolvedValue({ id: 'c-1' });
    await expect(service.companyRegister(dto)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('rubro invalido -> BadRequest', async () => {
    prisma.professionCategory.findFirst.mockResolvedValue(null);
    await expect(service.companyRegister(dto)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
