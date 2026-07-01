import { BadRequestException, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { ProfileStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { AuthService } from '../auth/auth.service';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { AdminService } from './admin.service';

jest.mock('bcrypt');

describe('AdminService.registerProfessional', () => {
  let service: AdminService;

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    professionCategory: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    role: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockMail = {};
  const mockConfig = { get: jest.fn() };
  const mockAuth = {};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: MailService, useValue: mockMail },
        { provide: ConfigService, useValue: mockConfig },
        { provide: AuthService, useValue: mockAuth },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);

    jest.clearAllMocks();
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed_password');
  });

  const validDto = {
    name: 'Juan Pérez',
    email: 'juan@example.com',
    password: 'secret123',
    city: 'Buenos Aires',
    rubroId: 1,
    countryId: 1,
    provinceId: 1,
    whatsapp: '+5491112345678',
    professionCategoryIds: [10, 11],
  };

  it('should create user and profile successfully with defaults', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.professionCategory.findFirst.mockResolvedValue({ id: 1, level: 1, isActive: true });
    mockPrisma.professionCategory.findMany.mockResolvedValue([{ id: 10 }, { id: 11 }]);
    mockPrisma.role.findUnique.mockResolvedValue({ id: 'role-professional' });
    mockPrisma.$transaction.mockImplementation(async (cb: any) => cb(mockPrisma));
    mockPrisma.user.create.mockResolvedValue({
      id: 'uuid-1',
      email: 'juan@example.com',
      emailVerified: true,
      userRoles: [
        { role: { name: 'professional', type: 'professional' } },
      ],
      profile: {
        id: 'uuid-profile',
        name: 'Juan Pérez',
        profileStatus: ProfileStatus.active,
        professionCategories: [],
        rubro: null,
      },
    });

    const result = await service.registerProfessional(validDto);

    expect(result.message).toBe('Profesional registrado exitosamente');
    expect(result.user.emailVerified).toBe(true);
    expect(result.user.profile.profileStatus).toBe(ProfileStatus.active);
    expect(mockPrisma.user.create).toHaveBeenCalled();
    expect(bcrypt.hash).toHaveBeenCalledWith('secret123', 10);
  });

  it('should throw ConflictException if email exists', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'existing' });

    await expect(service.registerProfessional(validDto)).rejects.toThrow(ConflictException);
  });

  it('should throw BadRequestException if rubroId is invalid', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.professionCategory.findFirst.mockResolvedValue(null);

    await expect(service.registerProfessional(validDto)).rejects.toThrow(BadRequestException);
  });

  it('should throw BadRequestException if professionCategoryIds without rubroId', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    const dto = { ...validDto, rubroId: undefined };

    await expect(service.registerProfessional(dto)).rejects.toThrow(BadRequestException);
  });

  it('should throw BadRequestException if professionCategoryIds mismatch rubro', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.professionCategory.findFirst.mockResolvedValue({ id: 1, level: 1, isActive: true });
    mockPrisma.professionCategory.findMany.mockResolvedValue([{ id: 10 }]);

    await expect(service.registerProfessional(validDto)).rejects.toThrow(BadRequestException);
  });

  it('should use custom emailVerified and profileStatus when provided', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.professionCategory.findFirst.mockResolvedValue({ id: 1, level: 1, isActive: true });
    mockPrisma.professionCategory.findMany.mockResolvedValue([{ id: 10 }, { id: 11 }]);
    mockPrisma.role.findUnique.mockResolvedValue({ id: 'role-professional' });
    mockPrisma.$transaction.mockImplementation(async (cb: any) => cb(mockPrisma));
    mockPrisma.user.create.mockResolvedValue({
      id: 'uuid-2',
      email: 'test@test.com',
      emailVerified: false,
      profile: { profileStatus: ProfileStatus.onboarding },
    });

    const result = await service.registerProfessional({
      ...validDto,
      email: 'test@test.com',
      emailVerified: false,
      profileStatus: ProfileStatus.onboarding,
    });

    expect(result.user.emailVerified).toBe(false);
    expect(result.user.profile.profileStatus).toBe(ProfileStatus.onboarding);
  });

  it('should accept minimal DTO with only required fields', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockPrisma.role.findUnique.mockResolvedValue({ id: 'role-professional' });
    mockPrisma.$transaction.mockImplementation(async (cb: any) => cb(mockPrisma));
    mockPrisma.user.create.mockResolvedValue({
      id: 'uuid-3',
      email: 'minimal@test.com',
      emailVerified: true,
      profile: { profileStatus: ProfileStatus.active },
    });

    const result = await service.registerProfessional({
      name: 'Minimal',
      email: 'minimal@test.com',
      password: '123456',
    });

    expect(result.message).toBe('Profesional registrado exitosamente');
    expect(mockPrisma.user.create).toHaveBeenCalled();
    const createData = mockPrisma.user.create.mock.calls[0][0].data;
    expect(createData.emailVerified).toBe(true);
    expect(createData.profile.create.profileStatus).toBe(ProfileStatus.active);
    expect(createData.profile.create.services).toEqual([]);
    expect(createData.profile.create.hideProfile).toBe(false);
  });
});
