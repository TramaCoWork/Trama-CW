import {
  Body,
  Controller,
  ForbiddenException,
  HttpStatus,
  Get,
  Inject,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiParam,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import * as fs from 'fs';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserType } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { STORAGE_SERVICE } from '../uploads/storage.interface';
import type { StorageService } from '../uploads/storage.interface';
import { createPhotoFileValidationPipe } from '../uploads/photo-file-validation';
import { AssociateImagesDto } from './dto/associate-images.dto';
import { CommunityImagesService } from './community-images.service';

@ApiTags('Community Uploads')
@Controller('community/uploads')
export class CommunityUploadsController {
  constructor(
    @Inject(STORAGE_SERVICE)
    private readonly storageService: StorageService,
    private readonly communityImagesService: CommunityImagesService,
  ) {}

  @Post('images')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Subir imagen de community' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Imagen subida correctamente' })
  @ApiResponse({ status: 400, description: 'Archivo inválido' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(
    @CurrentUser() user: CurrentUserType,
    @UploadedFile(createPhotoFileValidationPipe(HttpStatus.BAD_REQUEST))
    file: Express.Multer.File,
  ) {
    const upload = await this.storageService.upload(
      file,
      `community/${user.userId}`,
    );

    const imageRecord = await this.communityImagesService.createRecord(
      user.userId,
      {
        url: upload.url,
        mimeType: file.mimetype,
        size: file.size,
      },
    );

    return { id: imageRecord.id, url: imageRecord.url };
  }

  @Patch('images/associate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Asociar imágenes de community a una entidad' })
  @ApiResponse({ status: 200, description: 'Imágenes asociadas correctamente' })
  @ApiResponse({
    status: 400,
    description: 'Payload inválido o límite excedido',
  })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({
    status: 403,
    description: 'No autorizado para asociar alguna imagen',
  })
  async associateImages(
    @CurrentUser() user: CurrentUserType,
    @Body() body: AssociateImagesDto,
  ) {
    return this.communityImagesService.associate(
      user.userId,
      body.imageIds,
      body.entityType,
      body.entityId,
    );
  }

  @Get('images/:id')
  @ApiOperation({ summary: 'Obtener imagen de community por ID' })
  @ApiParam({ name: 'id', description: 'UUID del registro de imagen' })
  @ApiResponse({ status: 200, description: 'Imagen encontrada' })
  @ApiResponse({ status: 404, description: 'Imagen no encontrada' })
  async getImage(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Res() res: Response,
  ) {
    const image = await this.communityImagesService.findById(id);
    if (!image) {
      throw new NotFoundException('Imagen no encontrada');
    }

    const relativePath = image.url.replace('/uploads/', '');
    const absolutePath = this.storageService.getAbsolutePath(relativePath);

    if (!fs.existsSync(absolutePath)) {
      throw new NotFoundException('Imagen no encontrada');
    }

    if (!image.mimeType.startsWith('image/')) {
      throw new ForbiddenException('Tipo de archivo inválido');
    }

    res.setHeader('Content-Type', image.mimeType);
    res.sendFile(absolutePath);
  }
}

// Trazabilidad: generado por Programmer en 2026-05-15 17:08:26
