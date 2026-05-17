import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CommunityUploadsController } from './community-uploads.controller';

describe('CommunityUploadsController', () => {
  let controller: CommunityUploadsController;
  const communityImagesService = {
    createRecord: jest.fn(),
    associate: jest.fn(),
    findById: jest.fn(),
    validateProfessional: jest.fn(),
  };
  const storageService = {
    upload: jest.fn(),
    getAbsolutePath: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new CommunityUploadsController(
      storageService as any,
      communityImagesService as any,
    );
  });

  it('POST images con imagen válida devuelve id y url', async () => {
    storageService.upload.mockResolvedValue({
      url: '/uploads/community/user-1/image.png',
      path: 'community/user-1/image.png',
    });
    communityImagesService.createRecord.mockResolvedValue({
      id: 'img-1',
      url: '/uploads/community/user-1/image.png',
    });

    const file = {
      mimetype: 'image/png',
      size: 1024,
    } as Express.Multer.File;
    const user = { userId: 'user-1' };

    await expect(controller.uploadImage(user as any, file)).resolves.toEqual({
      id: 'img-1',
      url: '/uploads/community/user-1/image.png',
    });
    expect(storageService.upload).toHaveBeenCalledWith(file, 'community/user-1');
  });

  it('POST images sin archivo devuelve 400', async () => {
    await expect(controller.uploadImage({ userId: 'u1' } as any, undefined)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('POST images con MIME no imagen devuelve 400', async () => {
    const file = {
      mimetype: 'application/pdf',
      size: 1024,
    } as Express.Multer.File;

    await expect(controller.uploadImage({ userId: 'u1' } as any, file)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('POST images con archivo mayor a 5MB devuelve 400', async () => {
    const file = {
      mimetype: 'image/jpeg',
      size: 6 * 1024 * 1024,
    } as Express.Multer.File;

    await expect(controller.uploadImage({ userId: 'u1' } as any, file)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('GET images con id válido existente llama sendFile', async () => {
    communityImagesService.findById.mockResolvedValue({
      id: 'img-1',
      userId: 'user-1',
      filename: 'file.png',
      mimeType: 'image/png',
    });
    storageService.getAbsolutePath.mockReturnValue('C:/uploads/community/user-1/file.png');

    const fsModule = require('fs') as typeof import('fs');
    const existsSyncSpy = jest.spyOn(fsModule, 'existsSync').mockReturnValue(true);
    const setHeader = jest.fn();
    const sendFile = jest.fn();
    const res = { setHeader, sendFile };
    const user = { userId: 'viewer-1' };

    await controller.getImage(
      user as any,
      'e7f7b218-9cc7-4da6-bf5f-6a98f99ed910',
      res as any,
    );

    expect(storageService.getAbsolutePath).toHaveBeenCalledWith(
      'community/user-1/file.png',
    );
    expect(setHeader).toHaveBeenCalledWith('Content-Type', 'image/png');
    expect(sendFile).toHaveBeenCalledWith('C:/uploads/community/user-1/file.png');

    existsSyncSpy.mockRestore();
  });

  it('GET images con id inexistente devuelve 404', async () => {
    communityImagesService.findById.mockResolvedValue(null);
    const fsModule = require('fs') as typeof import('fs');
    const existsSyncSpy = jest.spyOn(fsModule, 'existsSync').mockReturnValue(false);

    await expect(
      controller.getImage(
        { userId: 'viewer-1' } as any,
        'e7f7b218-9cc7-4da6-bf5f-6a98f99ed910',
        {} as any,
      ),
    ).rejects.toBeInstanceOf(NotFoundException);

    existsSyncSpy.mockRestore();
  });
});

// Trazabilidad: generado por Programmer en 2026-05-15 17:08:26
