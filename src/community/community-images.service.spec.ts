import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { CommunityImageEntityType } from '@prisma/client';
import { CommunityImagesService } from './community-images.service';

describe('CommunityImagesService', () => {
  const prisma = {
    communityImage: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      updateMany: jest.fn(),
      findUnique: jest.fn(),
    },
    professionalProfile: {
      findUnique: jest.fn(),
    },
  };

  let service: CommunityImagesService;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.COMMUNITY_MAX_IMAGES_PER_ENTITY = '2';
    service = new CommunityImagesService(prisma as any);
  });

  afterEach(() => {
    delete process.env.COMMUNITY_MAX_IMAGES_PER_ENTITY;
  });

  it('createRecord crea y retorna registro', async () => {
    const record = { id: 'img-1', url: '/uploads/community/u1/a.png' };
    prisma.communityImage.create.mockResolvedValue(record);

    await expect(
      service.createRecord('user-1', {
        url: '/uploads/community/u1/a.png',
        mimeType: 'image/png',
        size: 123,
      }),
    ).resolves.toEqual(record);
  });

  it('associate asocia imágenes propias en happy path', async () => {
    prisma.communityImage.findMany
      .mockResolvedValueOnce([
        { id: 'img-1', userId: 'user-1', entityType: null, entityId: null },
        { id: 'img-2', userId: 'user-1', entityType: null, entityId: null },
      ])
      .mockResolvedValueOnce([
        {
          id: 'img-1',
          userId: 'user-1',
          entityType: CommunityImageEntityType.POST,
          entityId: 'post-1',
        },
        {
          id: 'img-2',
          userId: 'user-1',
          entityType: CommunityImageEntityType.POST,
          entityId: 'post-1',
        },
      ]);
    prisma.communityImage.count.mockResolvedValue(0);
    prisma.communityImage.updateMany.mockResolvedValue({ count: 2 });

    const result = await service.associate(
      'user-1',
      ['img-1', 'img-2'],
      CommunityImageEntityType.POST,
      'post-1',
    );

    expect(prisma.communityImage.updateMany).toHaveBeenCalled();
    expect(result).toHaveLength(2);
  });

  it('associate rechaza imágenes ajenas', async () => {
    prisma.communityImage.findMany.mockResolvedValue([
      { id: 'img-1', userId: 'other-user', entityType: null, entityId: null },
    ]);

    await expect(
      service.associate('user-1', ['img-1'], CommunityImageEntityType.POST, 'post-1'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('associate rechaza cuando supera límite', async () => {
    prisma.communityImage.findMany.mockResolvedValue([
      { id: 'img-1', userId: 'user-1', entityType: null, entityId: null },
    ]);
    prisma.communityImage.count.mockResolvedValue(2);

    await expect(
      service.associate('user-1', ['img-1'], CommunityImageEntityType.POST, 'post-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('associate falla si una imagen no existe', async () => {
    prisma.communityImage.findMany.mockResolvedValue([]);

    await expect(
      service.associate('user-1', ['img-1'], CommunityImageEntityType.POST, 'post-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('validateProfessional permite profesional validado', async () => {
    prisma.professionalProfile.findUnique.mockResolvedValue({
      isActive: true,
      profileStatus: 'active',
      user: { emailVerified: true },
    });

    await expect(service.validateProfessional('user-1')).resolves.toBeUndefined();
  });

  it('validateProfessional rechaza no validado', async () => {
    prisma.professionalProfile.findUnique.mockResolvedValue({
      isActive: false,
      profileStatus: 'active',
      user: { emailVerified: true },
    });

    await expect(service.validateProfessional('user-1')).rejects.toBeInstanceOf(ForbiddenException);
  });
});
