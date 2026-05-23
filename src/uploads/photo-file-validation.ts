import {
  HttpStatus,
  FileTypeValidator,
  MaxFileSizeValidator,
  ParseFilePipe,
} from '@nestjs/common';

export const PHOTO_MAX_FILE_SIZE = 2 * 1024 * 1024;

export const createPhotoFileValidationPipe = (errorHttpStatusCode: number = HttpStatus.BAD_REQUEST) =>
  new ParseFilePipe({
    errorHttpStatusCode,
    validators: [
      new FileTypeValidator({
        fileType: 'image/(jpeg|jpg|png|webp)',
        fallbackToMimetype: true,
      }),
      new MaxFileSizeValidator({ maxSize: PHOTO_MAX_FILE_SIZE }),
    ],
  });
