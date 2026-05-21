import {
  Injectable,
  Inject,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { UserRole, DocumentType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { STORAGE_SERVICE } from './storage.interface';
import type { StorageService } from './storage.interface';
import { UploadDocumentDto } from './dto/upload-document.dto';

const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const ALLOWED_PHOTO_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_PHOTO_SIZE = 2 * 1024 * 1024; // 2MB

@Injectable()
export class UploadsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_SERVICE) private readonly storage: StorageService,
  ) {}

  async uploadDocument(userId: string, file: Express.Multer.File, dto: UploadDocumentDto) {
    if (!file) {
      throw new BadRequestException('No se envio ningun archivo');
    }

    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException('Tipo de archivo no permitido. Solo PDF, JPG y PNG');
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException('El archivo excede el tamaño maximo de 5MB');
    }

    const profile = await this.prisma.professionalProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException('Perfil profesional no encontrado');
    }

    const { url, path } = await this.storage.upload(file, `documents/${profile.id}`);

    // Si la education asociada es de nivel "certificacion", forzar type = certificate
    if (dto.educationId) {
      const education = await this.prisma.education.findUnique({
        where: { id: dto.educationId },
        select: { level: true },
      });
      if (education?.level === 'certificacion') {
        dto.type = DocumentType.certificate;
      }
    }

    const document = await this.prisma.document.create({
      data: {
        professionalId: profile.id,
        type: dto.type,
        fileUrl: url,
        originalName: file.originalname,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        educationId: dto.educationId || null,
        certificationId: dto.certificationId || null,
        professionId: dto.professionId || null,
      },
    });

    return document;
  }

  async getDocument(id: string) {
    const document = await this.prisma.document.findUnique({
      where: { id },
    });

    if (!document) {
      throw new NotFoundException('Documento no encontrado');
    }

    return document;
  }

  async getDocumentFile(id: string, userId: string, userRole: UserRole) {
    const document = await this.prisma.document.findUnique({
      where: { id },
      include: { professional: true },
    });

    if (!document) {
      throw new NotFoundException('Documento no encontrado');
    }

    if (userRole !== UserRole.admin && document.professional.userId !== userId) {
      throw new ForbiddenException('No tiene permiso para ver este documento');
    }

    const relativePath = document.fileUrl.replace('/uploads/', '');
    const absolutePath = this.storage.getAbsolutePath(relativePath);
    return { absolutePath, document };
  }

  async deleteDocument(userId: string, id: string) {
    const document = await this.prisma.document.findUnique({
      where: { id },
      include: { professional: true },
    });

    if (!document) {
      throw new NotFoundException('Documento no encontrado');
    }

    if (document.professional.userId !== userId) {
      throw new ForbiddenException('No es propietario de este documento');
    }

    const relativePath = document.fileUrl.replace('/uploads/', '');
    await this.storage.delete(relativePath);

    await this.prisma.document.delete({ where: { id } });

    return { deleted: true };
  }

  async getDocumentsByProfile(professionalId: string) {
    return this.prisma.document.findMany({
      where: { professionalId },
      orderBy: { uploadedAt: 'desc' },
    });
  }

  async uploadPhoto(userId: string, file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No se envio ningun archivo');
    }

    if (!ALLOWED_PHOTO_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException('Tipo de archivo no permitido. Solo JPG, PNG y WebP');
    }

    if (file.size > MAX_PHOTO_SIZE) {
      throw new BadRequestException('El archivo excede el tamaño maximo de 2MB');
    }

    const profile = await this.prisma.professionalProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException('Perfil profesional no encontrado');
    }

    // Delete previous photo if exists
    if (profile.photo) {
      const oldRelativePath = profile.photo.replace('/uploads/', '');
      await this.storage.delete(oldRelativePath);
    }

    const { url } = await this.storage.upload(file, `photos/${profile.id}`);

    await this.prisma.professionalProfile.update({
      where: { id: profile.id },
      data: { photo: url },
    });

    return { url };
  }

  async adminUploadPhoto(profileId: string, file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No se envio ningun archivo');
    }

    if (!ALLOWED_PHOTO_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException('Tipo de archivo no permitido. Solo JPG, PNG y WebP');
    }

    if (file.size > MAX_PHOTO_SIZE) {
      throw new BadRequestException('El archivo excede el tamaño maximo de 2MB');
    }

    const profile = await this.prisma.professionalProfile.findUnique({
      where: { id: profileId },
    });

    if (!profile) {
      throw new NotFoundException('Perfil profesional no encontrado');
    }

    if (profile.photo) {
      const oldRelativePath = profile.photo.replace('/uploads/', '');
      await this.storage.delete(oldRelativePath);
    }

    const { url } = await this.storage.upload(file, `photos/${profile.id}`);

    await this.prisma.professionalProfile.update({
      where: { id: profile.id },
      data: { photo: url },
    });

    return { url };
  }

  async getPhotoFile(profileId: string) {
    const profile = await this.prisma.professionalProfile.findUnique({
      where: { id: profileId },
    });

    if (!profile || !profile.photo) {
      throw new NotFoundException('Foto de perfil no encontrada');
    }

    const relativePath = profile.photo.replace('/uploads/', '');
    const absolutePath = this.storage.getAbsolutePath(relativePath);

    // Determine content type from extension
    const ext = relativePath.split('.').pop()?.toLowerCase();
    const mimeMap: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
    };
    const contentType = mimeMap[ext || ''] || 'application/octet-stream';

    return { absolutePath, contentType };
  }

  async deletePhoto(userId: string) {
    const profile = await this.prisma.professionalProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException('Perfil profesional no encontrado');
    }

    if (!profile.photo) {
      throw new NotFoundException('No tiene foto de perfil');
    }

    const relativePath = profile.photo.replace('/uploads/', '');
    await this.storage.delete(relativePath);

    await this.prisma.professionalProfile.update({
      where: { id: profile.id },
      data: { photo: null },
    });

    return { deleted: true };
  }

  async uploadIdentity(
    userId: string,
    frontFile: Express.Multer.File,
    backFile: Express.Multer.File,
  ) {
    if (!frontFile || !backFile) {
      throw new BadRequestException('Debe enviar ambos archivos: frente (front) y dorso (back)');
    }

    for (const file of [frontFile, backFile]) {
      if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        throw new BadRequestException(`Tipo de archivo no permitido (${file.originalname}). Solo PDF, JPG y PNG`);
      }
      if (file.size > MAX_FILE_SIZE) {
        throw new BadRequestException(`El archivo ${file.originalname} excede el tamaño maximo de 5MB`);
      }
    }

    const profile = await this.prisma.professionalProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException('Perfil profesional no encontrado');
    }

    // Delete previous identity files if they exist
    if (profile.identityFrontUrl) {
      const oldPath = profile.identityFrontUrl.replace('/uploads/', '');
      await this.storage.delete(oldPath);
    }
    if (profile.identityBackUrl) {
      const oldPath = profile.identityBackUrl.replace('/uploads/', '');
      await this.storage.delete(oldPath);
    }

    const folder = `identity/${profile.id}`;
    const frontResult = await this.storage.upload(
      { ...frontFile, originalname: `frente${this.getExtension(frontFile.originalname)}` } as Express.Multer.File,
      folder,
    );
    const backResult = await this.storage.upload(
      { ...backFile, originalname: `dorso${this.getExtension(backFile.originalname)}` } as Express.Multer.File,
      folder,
    );

    await this.prisma.professionalProfile.update({
      where: { id: profile.id },
      data: {
        identityFrontUrl: frontResult.url,
        identityBackUrl: backResult.url,
      },
    });

    return {
      front: frontResult.url,
      back: backResult.url,
    };
  }

  async getIdentityFiles(profileId: string) {
    const profile = await this.prisma.professionalProfile.findUnique({
      where: { id: profileId },
    });

    if (!profile) {
      throw new NotFoundException('Perfil profesional no encontrado');
    }

    return {
      dni: profile.dni,
      frontUrl: profile.identityFrontUrl,
      backUrl: profile.identityBackUrl,
      hasFront: !!profile.identityFrontUrl,
      hasBack: !!profile.identityBackUrl,
    };
  }

  async getIdentityFile(profileId: string, side: 'front' | 'back') {
    const profile = await this.prisma.professionalProfile.findUnique({
      where: { id: profileId },
    });

    if (!profile) {
      throw new NotFoundException('Perfil profesional no encontrado');
    }

    const url = side === 'front' ? profile.identityFrontUrl : profile.identityBackUrl;
    if (!url) {
      throw new NotFoundException(`Documento de identidad (${side === 'front' ? 'frente' : 'dorso'}) no encontrado`);
    }

    const relativePath = url.replace('/uploads/', '');
    const absolutePath = this.storage.getAbsolutePath(relativePath);

    const ext = relativePath.split('.').pop()?.toLowerCase();
    const mimeMap: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      pdf: 'application/pdf',
    };
    const contentType = mimeMap[ext || ''] || 'application/octet-stream';

    return { absolutePath, contentType };
  }

  private getExtension(filename: string): string {
    const dotIndex = filename.lastIndexOf('.');
    return dotIndex >= 0 ? filename.substring(dotIndex) : '';
  }
}
