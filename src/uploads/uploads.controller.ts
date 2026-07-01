import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  Res,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { FileInterceptor, FileFieldsInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { UploadsService } from './uploads.service';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserType } from '../auth/decorators/current-user.decorator';
import { createPhotoFileValidationPipe, PHOTO_MAX_FILE_SIZE } from './photo-file-validation';

@ApiTags('Uploads')
@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post('document')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('professional')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Subir un documento (DNI, CV, titulo, certificado)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'type'],
      properties: {
        file: { type: 'string', format: 'binary', description: 'Archivo (PDF, JPG o PNG, max 5MB)' },
        type: { type: 'string', enum: ['dni', 'cv', 'title', 'certificate'], description: 'Tipo de documento' },
        educationId: { type: 'string', format: 'uuid', description: 'ID de educacion asociada (opcional)' },
        certificationId: { type: 'string', format: 'uuid', description: 'ID de certificacion asociada (opcional)' },
        professionId: { type: 'integer', description: 'ID de la profesion asociada (nivel 3, opcional)' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Documento subido exitosamente' })
  @ApiResponse({ status: 400, description: 'Archivo invalido o faltante' })
  @ApiResponse({ status: 404, description: 'Perfil profesional no encontrado' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadDocument(
    @CurrentUser() user: CurrentUserType,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadDocumentDto,
  ) {
    return this.uploadsService.uploadDocument(user.userId, file, dto);
  }

  @Get('document/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Descargar un documento por ID (solo dueno o admin)' })
  @ApiResponse({ status: 200, description: 'Archivo descargado' })
  @ApiResponse({ status: 401, description: 'No autenticado' })
  @ApiResponse({ status: 403, description: 'No tiene permiso para ver este documento' })
  @ApiResponse({ status: 404, description: 'Documento no encontrado' })
  async getDocument(
    @CurrentUser() user: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ) {
    const { absolutePath, document } = await this.uploadsService.getDocumentFile(
      id,
      user.userId,
      user.roles,
    );
    res.setHeader('Content-Type', document.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${document.originalName}"`);
    res.sendFile(absolutePath);
  }

  @Delete('document/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('professional')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Eliminar un documento' })
  @ApiResponse({ status: 200, description: 'Documento eliminado' })
  @ApiResponse({ status: 403, description: 'No es propietario del documento' })
  @ApiResponse({ status: 404, description: 'Documento no encontrado' })
  async deleteDocument(
    @CurrentUser() user: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.uploadsService.deleteDocument(user.userId, id);
  }

  @Post('photo')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('professional')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Subir o reemplazar foto de perfil' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: `Imagen (JPG, PNG o WebP, max ${PHOTO_MAX_FILE_SIZE / (1024 * 1024)}MB)`,
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Foto subida exitosamente', schema: { properties: { url: { type: 'string' } } } })
  @ApiResponse({ status: 400, description: 'Archivo invalido o faltante' })
  @ApiResponse({ status: 404, description: 'Perfil profesional no encontrado' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadPhoto(
    @CurrentUser() user: CurrentUserType,
    @UploadedFile(createPhotoFileValidationPipe(HttpStatus.BAD_REQUEST)) file: Express.Multer.File,
  ) {
    return this.uploadsService.uploadPhoto(user.userId, file);
  }

  @Post('admin/professionals/:id/photo')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: PHOTO_MAX_FILE_SIZE } }))
  @ApiOperation({ summary: 'Subir foto de perfil de un profesional (admin)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Foto subida exitosamente' })
  @ApiResponse({ status: 404, description: 'Perfil profesional no encontrado' })
  async adminUploadPhoto(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile(createPhotoFileValidationPipe(HttpStatus.BAD_REQUEST)) file: Express.Multer.File,
  ) {
    const { url } = await this.uploadsService.adminUploadPhoto(id, file);
    return { message: 'Foto subida exitosamente', url };
  }

  @Get('photo/:profileId')
  @ApiOperation({ summary: 'Obtener foto de perfil de un profesional (publico)' })
  @ApiResponse({ status: 200, description: 'Imagen del perfil' })
  @ApiResponse({ status: 404, description: 'Foto no encontrada' })
  async getPhoto(
    @Param('profileId', ParseUUIDPipe) profileId: string,
    @Res() res: Response,
  ) {
    const { absolutePath, contentType } = await this.uploadsService.getPhotoFile(profileId);
    res.setHeader('Content-Type', contentType);
    res.sendFile(absolutePath);
  }

  @Delete('photo')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('professional')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Eliminar foto de perfil' })
  @ApiResponse({ status: 200, description: 'Foto eliminada' })
  @ApiResponse({ status: 404, description: 'No tiene foto de perfil' })
  async deletePhoto(
    @CurrentUser() user: CurrentUserType,
  ) {
    return this.uploadsService.deletePhoto(user.userId);
  }

  @Post('identity')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('professional')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Subir frente y dorso del documento de identidad' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['front', 'back'],
      properties: {
        front: { type: 'string', format: 'binary', description: 'Imagen frente del DNI (PDF, JPG o PNG, max 5MB)' },
        back: { type: 'string', format: 'binary', description: 'Imagen dorso del DNI (PDF, JPG o PNG, max 5MB)' },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Documentos de identidad subidos exitosamente' })
  @ApiResponse({ status: 400, description: 'Archivos invalidos o faltantes' })
  @ApiResponse({ status: 404, description: 'Perfil profesional no encontrado' })
  @UseInterceptors(FileFieldsInterceptor([
    { name: 'front', maxCount: 1 },
    { name: 'back', maxCount: 1 },
  ]))
  async uploadIdentity(
    @CurrentUser() user: CurrentUserType,
    @UploadedFiles() files: { front?: Express.Multer.File[]; back?: Express.Multer.File[] },
  ) {
    return this.uploadsService.uploadIdentity(
      user.userId,
      files.front?.[0] as Express.Multer.File,
      files.back?.[0] as Express.Multer.File,
    );
  }

  @Get('identity/:profileId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener info de documentos de identidad de un profesional (admin)' })
  @ApiResponse({ status: 200, description: 'Datos del documento de identidad (dni, URLs frente y dorso)' })
  @ApiResponse({ status: 404, description: 'Perfil no encontrado' })
  async getIdentityFiles(
    @Param('profileId', ParseUUIDPipe) profileId: string,
  ) {
    return this.uploadsService.getIdentityFiles(profileId);
  }

  @Get('identity/:profileId/:side')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Descargar imagen de identidad frente o dorso (admin)' })
  @ApiResponse({ status: 200, description: 'Archivo de imagen del documento' })
  @ApiResponse({ status: 404, description: 'Documento no encontrado' })
  async getIdentityFile(
    @Param('profileId', ParseUUIDPipe) profileId: string,
    @Param('side') side: 'front' | 'back',
    @Res() res: Response,
  ) {
    const { absolutePath, contentType } = await this.uploadsService.getIdentityFile(profileId, side);
    res.setHeader('Content-Type', contentType);
    res.sendFile(absolutePath);
  }
}
