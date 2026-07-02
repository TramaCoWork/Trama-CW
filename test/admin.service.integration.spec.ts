import {
  BadRequestException,
  ConflictException,
  INestApplication,
  NotFoundException,
} from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { AdminModule } from '../src/admin/admin.module';
import { AdminRegisterProfessionalDto } from '../src/admin/dto/admin-register-professional.dto';
import { AdminService } from '../src/admin/admin.service';
import { MailService } from '../src/mail/mail.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { cleanDatabase } from './clean-database';

describe('AdminService (integration)', () => {
  let app: INestApplication;
  let adminService: AdminService;
  let prismaService: PrismaService;
  let mailService: {
    sendProfileApproved: jest.Mock<Promise<void>, [string, string]>;
    sendProfileRejected: jest.Mock<
      Promise<void>,
      [string, string, string | undefined]
    >;
  };
  let configService: { get: jest.Mock<number, [string, number?]> };

  let rubroId: number;
  let subRubroId: number;
  let professionCategoryIds: [number, number];
  let inactiveProfessionCategoryId: number;

  const buildRegisterDto = (
    overrides: Partial<AdminRegisterProfessionalDto> = {},
  ): AdminRegisterProfessionalDto => ({
    name: 'Professional Name',
    email: `professional-${Date.now()}-${Math.floor(Math.random() * 10000)}@test.com`,
    password: 'password123',
    city: 'Buenos Aires',
    rubroId,
    professionCategoryIds,
    ...overrides,
  });

  const createAdminUser = async () => {
    const adminRole = await prismaService.role.findUniqueOrThrow({
      where: { name: 'admin' },
    });

    return prismaService.user.create({
      data: {
        email: `admin-${Date.now()}-${Math.floor(Math.random() * 10000)}@test.com`,
        passwordHash: 'admin-password-hash',
        emailVerified: true,
        userRoles: { create: [{ roleId: adminRole.id }] },
      },
    });
  };

  const createProfessional = async (
    overrides: Partial<AdminRegisterProfessionalDto> = {},
  ) => {
    const result = await adminService.registerProfessional(
      buildRegisterDto(overrides),
    );
    const profile = await prismaService.professionalProfile.findUniqueOrThrow({
      where: { userId: result.user.id },
      include: { professionCategories: true },
    });

    return { user: result.user, profile };
  };

  beforeAll(async () => {
    mailService = {
      sendProfileApproved: jest.fn().mockResolvedValue(undefined),
      sendProfileRejected: jest.fn().mockResolvedValue(undefined),
    };
    configService = {
      get: jest.fn().mockReturnValue(0),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AdminModule, ConfigModule.forRoot({ isGlobal: true })],
    })
      .overrideProvider(MailService)
      .useValue(mailService)
      .overrideProvider(ConfigService)
      .useValue(configService)
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();

    adminService = app.get(AdminService);
    prismaService = app.get(PrismaService);

    const rubro = await prismaService.professionCategory.create({
      data: {
        slug: `test-rubro-${Date.now()}`,
        name: 'Test Rubro',
        level: 1,
        isActive: true,
      },
    });
    rubroId = rubro.id;

    const subRubro = await prismaService.professionCategory.create({
      data: {
        slug: `test-sub-rubro-${Date.now()}`,
        name: 'Test Sub Rubro',
        level: 2,
        isActive: true,
        parentId: rubroId,
      },
    });
    subRubroId = subRubro.id;

    const professionOne = await prismaService.professionCategory.create({
      data: {
        slug: `test-profession-1-${Date.now()}`,
        name: 'Test Profession One',
        level: 3,
        isActive: true,
        parentId: subRubroId,
      },
    });

    const professionTwo = await prismaService.professionCategory.create({
      data: {
        slug: `test-profession-2-${Date.now()}`,
        name: 'Test Profession Two',
        level: 3,
        isActive: true,
        parentId: subRubroId,
      },
    });

    const inactiveProfession = await prismaService.professionCategory.create({
      data: {
        slug: `test-profession-inactive-${Date.now()}`,
        name: 'Test Profession Inactive',
        level: 3,
        isActive: false,
        parentId: subRubroId,
      },
    });

    professionCategoryIds = [professionOne.id, professionTwo.id];
    inactiveProfessionCategoryId = inactiveProfession.id;
  });

  beforeEach(async () => {
    await cleanDatabase(app);
    mailService.sendProfileApproved.mockClear();
    mailService.sendProfileRejected.mockClear();
    configService.get.mockReset();
    configService.get.mockReturnValue(0);
  });

  afterAll(async () => {
    await cleanDatabase(app);
    await app.close();
  });

  it('should register professional with valid data', async () => {
    const dto = buildRegisterDto();

    const result = await adminService.registerProfessional(dto);

    expect(result.user.email).toBe(dto.email);
    expect(result.user.passwordHash).not.toBe(dto.password);
    await expect(
      bcrypt.compare(dto.password, result.user.passwordHash),
    ).resolves.toBe(true);

    const persistedProfile =
      await prismaService.professionalProfile.findUniqueOrThrow({
        where: { userId: result.user.id },
        include: { professionCategories: true },
      });

    expect(persistedProfile.rubroId).toBe(rubroId);
    expect(
      persistedProfile.professionCategories
        .map((category) => category.id)
        .sort(),
    ).toEqual([...professionCategoryIds].sort());
  });

  it('should reject duplicate email', async () => {
    const email = `duplicate-${Date.now()}@test.com`;
    await adminService.registerProfessional(buildRegisterDto({ email }));

    await expect(
      adminService.registerProfessional(buildRegisterDto({ email })),
    ).rejects.toThrow(ConflictException);

    expect(await prismaService.user.count({ where: { email } })).toBe(1);
  });

  it('should reject invalid rubroId', async () => {
    await expect(
      adminService.registerProfessional(
        buildRegisterDto({ rubroId: 99999999 }),
      ),
    ).rejects.toThrow(BadRequestException);

    expect(await prismaService.user.count()).toBe(0);
    expect(await prismaService.professionalProfile.count()).toBe(0);
  });

  it('should reject invalid professionCategoryIds', async () => {
    await expect(
      adminService.registerProfessional(
        buildRegisterDto({
          professionCategoryIds: [subRubroId],
        }),
      ),
    ).rejects.toThrow(BadRequestException);

    await expect(
      adminService.registerProfessional(
        buildRegisterDto({
          professionCategoryIds: [inactiveProfessionCategoryId],
        }),
      ),
    ).rejects.toThrow(BadRequestException);

    expect(await prismaService.user.count()).toBe(0);
    expect(await prismaService.professionalProfile.count()).toBe(0);
  });

  it('should rollback transaction if profile creation fails', async () => {
    const email = `rollback-${Date.now()}@test.com`;

    await expect(
      adminService.registerProfessional(
        buildRegisterDto({
          email,
          countryId: 99999999,
        }),
      ),
    ).rejects.toThrow();

    expect(
      await prismaService.user.findUnique({ where: { email } }),
    ).toBeNull();
    expect(await prismaService.professionalProfile.count()).toBe(0);
  });

  it('should update professional profile and user email', async () => {
    const { profile, user } = await createProfessional({
      professionCategoryIds: [professionCategoryIds[0]],
      emailVerified: false,
    });

    const updated = await adminService.updateProfessional(profile.id, {
      name: 'Updated Professional',
      emailVerified: true,
      professionCategoryIds: [professionCategoryIds[1]],
    });

    expect(updated.name).toBe('Updated Professional');
    expect(updated.professionCategories.map((category) => category.id)).toEqual(
      [professionCategoryIds[1]],
    );

    const persistedUser = await prismaService.user.findUniqueOrThrow({
      where: { id: user.id },
    });
    expect(persistedUser.emailVerified).toBe(true);
  });

  it('should partially update professional', async () => {
    const { profile } = await createProfessional({
      name: 'Initial Name',
      city: 'Rosario',
      professionCategoryIds: [professionCategoryIds[0]],
    });

    const updated = await adminService.updateProfessional(profile.id, {
      name: 'Only Name Updated',
    });

    expect(updated.name).toBe('Only Name Updated');
    expect(updated.city).toBe('Rosario');
    expect(updated.professionCategories.map((category) => category.id)).toEqual(
      [professionCategoryIds[0]],
    );
  });

  it('should approve professional', async () => {
    const { profile } = await createProfessional({
      isActive: false,
      profileStatus: 'pending_review',
    });

    const approved = await adminService.approveProfessional(profile.id);

    expect(approved.isActive).toBe(true);
    expect(approved.profileStatus).toBe('active');
  });

  it('should throw 404 if profile not found', async () => {
    await expect(
      adminService.approveProfessional('00000000-0000-0000-0000-000000000000'),
    ).rejects.toThrow(NotFoundException);
  });

  it('should validate profile and send approval email', async () => {
    const { profile, user } = await createProfessional({
      profileStatus: 'pending_review',
      isActive: false,
    });
    const adminUser = await createAdminUser();

    const validation = await adminService.validateProfile(
      adminUser.id,
      profile.id,
      {
        status: 'manual_approved',
        reviewNotes: 'Approved by admin',
        documentsReviewed: [],
      },
    );

    expect(validation.professionalId).toBe(profile.id);
    expect(validation.reviewedBy).toBe(adminUser.id);
    expect(validation.status).toBe('manual_approved');

    const persistedProfile =
      await prismaService.professionalProfile.findUniqueOrThrow({
        where: { id: profile.id },
      });
    expect(persistedProfile.profileStatus).toBe('active');
    expect(persistedProfile.isActive).toBe(true);

    expect(mailService.sendProfileApproved).toHaveBeenCalledTimes(1);
    expect(mailService.sendProfileApproved).toHaveBeenCalledWith(
      user.email,
      profile.name,
    );
  });

  it('should reject profile and send rejection email', async () => {
    const { profile, user } = await createProfessional({
      profileStatus: 'pending_review',
      isActive: false,
    });
    const adminUser = await createAdminUser();

    await adminService.validateProfile(adminUser.id, profile.id, {
      status: 'manual_rejected',
      reviewNotes: 'Missing document',
      documentsReviewed: [],
    });

    const persistedProfile =
      await prismaService.professionalProfile.findUniqueOrThrow({
        where: { id: profile.id },
      });
    expect(persistedProfile.profileStatus).toBe('rejected');
    expect(persistedProfile.isActive).toBe(false);

    expect(mailService.sendProfileRejected).toHaveBeenCalledTimes(1);
    expect(mailService.sendProfileRejected).toHaveBeenCalledWith(
      user.email,
      profile.name,
      'Missing document',
    );
  });

  it('should set trialEndDate based on TRIAL_DAYS config', async () => {
    const firstProfessional = await createProfessional({
      profileStatus: 'pending_review',
      isActive: false,
    });
    const adminUser = await createAdminUser();

    configService.get.mockReturnValue(30);
    await adminService.validateProfile(
      adminUser.id,
      firstProfessional.profile.id,
      {
        status: 'manual_approved',
        reviewNotes: 'Approved with trial',
        documentsReviewed: [],
      },
    );

    const approvedWithTrial =
      await prismaService.professionalProfile.findUniqueOrThrow({
        where: { id: firstProfessional.profile.id },
      });
    expect(approvedWithTrial.trialEndDate).not.toBeNull();

    const millisecondsIn30Days = 30 * 24 * 60 * 60 * 1000;
    const diff = Math.abs(
      approvedWithTrial.trialEndDate!.getTime() -
        (Date.now() + millisecondsIn30Days),
    );
    expect(diff).toBeLessThan(30 * 1000);

    const secondProfessional = await createProfessional({
      profileStatus: 'pending_review',
      isActive: false,
    });

    configService.get.mockReturnValue(0);
    await adminService.validateProfile(
      adminUser.id,
      secondProfessional.profile.id,
      {
        status: 'manual_approved',
        reviewNotes: 'Approved without trial',
        documentsReviewed: [],
      },
    );

    const approvedWithoutTrial =
      await prismaService.professionalProfile.findUniqueOrThrow({
        where: { id: secondProfessional.profile.id },
      });
    expect(approvedWithoutTrial.trialEndDate).toBeNull();
    expect(configService.get).toHaveBeenCalledWith('TRIAL_DAYS', 0);
  });
});
