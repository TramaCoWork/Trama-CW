import { NotFoundException } from '@nestjs/common';
import { CommunityUploadsController } from './community-uploads.controller';
import { PHOTO_MAX_FILE_SIZE } from '../uploads/photo-file-validation';

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
    expect(storageService.upload).toHaveBeenCalledWith(
      file,
      'community/user-1',
    );
  });

  it('POST images valida límites configurados para pipe de archivo', () => {
    expect(PHOTO_MAX_FILE_SIZE).toBe(2 * 1024 * 1024);
  });

  it('GET images con id válido existente llama sendFile', async () => {
    communityImagesService.findById.mockResolvedValue({
      id: 'img-1',
      userId: 'user-1',
      url: '/uploads/community/user-1/file.png',
      mimeType: 'image/png',
    });
    storageService.getAbsolutePath.mockReturnValue(
      'C:/uploads/community/user-1/file.png',
    );

    const fsModule = require('fs') as typeof import('fs');
    const existsSyncSpy = jest
      .spyOn(fsModule, 'existsSync')
      .mockReturnValue(true);
    const setHeader = jest.fn();
    const sendFile = jest.fn();
    const res = { setHeader, sendFile };

    await controller.getImage(
      'e7f7b218-9cc7-4da6-bf5f-6a98f99ed910',
      res as any,
    );

    expect(storageService.getAbsolutePath).toHaveBeenCalledWith(
      'community/user-1/file.png',
    );
    expect(setHeader).toHaveBeenCalledWith('Content-Type', 'image/png');
    expect(sendFile).toHaveBeenCalledWith(
      'C:/uploads/community/user-1/file.png',
    );

    existsSyncSpy.mockRestore();
  });

  it('GET images con id inexistente devuelve 404', async () => {
    communityImagesService.findById.mockResolvedValue(null);
    const fsModule = require('fs') as typeof import('fs');
    const existsSyncSpy = jest
      .spyOn(fsModule, 'existsSync')
      .mockReturnValue(false);

    await expect(
      controller.getImage('e7f7b218-9cc7-4da6-bf5f-6a98f99ed910', {} as any),
    ).rejects.toBeInstanceOf(NotFoundException);

    existsSyncSpy.mockRestore();
  });
});

// Trazabilidad: generado por Programmer en 2026-05-15 17:08:26
