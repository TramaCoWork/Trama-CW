import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CommunityImage, CommunityImageEntityType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const DEFAULT_MAX_IMAGES_PER_ENTITY = 10;

type CommunityImageUploadMetadata = {
  filename: string;
  url: string;
  mimeType: string;
  size: number;
};

@Injectable()
export class CommunityImagesService {
  private readonly maxImagesPerEntity: number;

  constructor(private readonly prisma: PrismaService) {
    const envValue = Number.parseInt(
      process.env.COMMUNITY_MAX_IMAGES_PER_ENTITY ?? `${DEFAULT_MAX_IMAGES_PER_ENTITY}`,
      10,
    );

    this.maxImagesPerEntity = Number.isNaN(envValue)
      ? DEFAULT_MAX_IMAGES_PER_ENTITY
      : envValue;
  }

  createRecord(userId: string, metadata: CommunityImageUploadMetadata): Promise<CommunityImage> {
    return this.prisma.communityImage.create({
      data: {
        userId,
        filename: metadata.filename,
        url: metadata.url,
        mimeType: metadata.mimeType,
        size: metadata.size,
      },
    });
  }

  async associate(
    userId: string,
    imageIds: string[],
    entityType: CommunityImageEntityType,
    entityId: string,
  ) {
    const images = await this.getOwnedImages(userId, imageIds);
    await this.ensureAssociationLimit(userId, entityType, entityId, images);

    const uniqueImageIds = [...new Set(imageIds)];
    await this.prisma.communityImage.updateMany({
      where: {
        id: { in: uniqueImageIds },
        userId,
      },
      data: {
        entityType,
        entityId,
      },
    });

    return this.prisma.communityImage.findMany({
      where: {
        id: { in: uniqueImageIds },
      },
    });
  }

  private async getOwnedImages(userId: string, imageIds: string[]) {
    const uniqueImageIds = [...new Set(imageIds)];
    const images = await this.prisma.communityImage.findMany({
      where: { id: { in: uniqueImageIds } },
    });

    if (images.length !== uniqueImageIds.length) {
      throw new NotFoundException('Una o más imágenes no existen');
    }

    const hasForeignImage = images.some((image) => image.userId !== userId);
    if (hasForeignImage) {
      throw new ForbiddenException('Solo puedes asociar imágenes propias');
    }

    return images;
  }

  private async ensureAssociationLimit(
    userId: string,
    entityType: CommunityImageEntityType,
    entityId: string,
    images: Pick<CommunityImage, 'entityType' | 'entityId'>[],
  ) {
    const currentCount = await this.prisma.communityImage.count({
      where: {
        userId,
        entityType,
        entityId,
      },
    });

    const imagesToAssociateCount = images.filter(
      (image) => image.entityType !== entityType || image.entityId !== entityId,
    ).length;

    if (currentCount + imagesToAssociateCount > this.maxImagesPerEntity) {
      throw new BadRequestException(
        `Máximo ${this.maxImagesPerEntity} imágenes por entidad`,
      );
    }
  }

  findById(id: string): Promise<CommunityImage | null> {
    return this.prisma.communityImage.findUnique({
      where: { id },
    });
  }

  async validateProfessional(userId: string): Promise<void> {
    const profile = await this.prisma.professionalProfile.findUnique({
      where: { userId },
      select: {
        isActive: true,
        profileStatus: true,
        user: { select: { emailVerified: true } },
      },
    });

    const isValidatedProfessional = Boolean(
      profile && profile.isActive && profile.profileStatus === 'active' && profile.user.emailVerified,
    );

    if (!isValidatedProfessional) {
      throw new ForbiddenException('Solo profesionales validados pueden acceder a imágenes');
    }
  }
}

// Trazabilidad: generado por Programmer en 2026-05-15 18:02:40
