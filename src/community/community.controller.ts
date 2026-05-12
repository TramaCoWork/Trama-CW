import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CommunityService } from './community.service';
import { CreatePostDto } from './dto/create-post.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdatePostStatusDto } from './dto/update-post-status.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserType } from '../auth/decorators/current-user.decorator';

@ApiTags('Community')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('community')
export class CommunityController {
  constructor(private readonly communityService: CommunityService) {}

  @Get('channels')
  @ApiOperation({ summary: 'Listar canales disponibles para el usuario (general + su rubro)' })
  @ApiResponse({ status: 200, description: 'Lista de canales con slug y nombre' })
  getChannels(@CurrentUser() user: CurrentUserType) {
    return this.communityService.getChannels(user.userId);
  }

  @Get('my-posts')
  @ApiOperation({ summary: 'Listar mis posts con los comentarios recibidos' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Numero de pagina (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Posts por pagina (default: 20)' })
  @ApiResponse({ status: 200, description: 'Lista paginada de posts del usuario con comentarios' })
  getMyPosts(
    @CurrentUser() user: CurrentUserType,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.communityService.getMyPosts(
      user.userId,
      parseInt(page ?? '1', 10),
      parseInt(limit ?? '20', 10),
    );
  }

  @Get('posts')
  @ApiOperation({ summary: 'Listar posts de un canal' })
  @ApiQuery({ name: 'channel', required: false, description: 'Slug del canal (default: "general")' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Numero de pagina (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Posts por pagina (default: 20)' })
  @ApiResponse({ status: 200, description: 'Lista paginada de posts con comentarios' })
  @ApiResponse({ status: 403, description: 'No tienes acceso a este canal' })
  getPosts(
    @CurrentUser() user: CurrentUserType,
    @Query('channel') channel?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.communityService.getPosts(
      user.userId,
      channel ?? 'general',
      parseInt(page ?? '1', 10),
      parseInt(limit ?? '20', 10),
    );
  }

  @Get('posts/:id/comments')
  @ApiOperation({ summary: 'Listar comentarios de un post (paginado, mas recientes primero)' })
  @ApiParam({ name: 'id', description: 'ID del post' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Numero de pagina (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Comentarios por pagina (default: 10)' })
  @ApiResponse({ status: 200, description: 'Lista paginada de comentarios' })
  @ApiResponse({ status: 403, description: 'No tienes acceso al canal de este post' })
  @ApiResponse({ status: 404, description: 'Post no encontrado' })
  getPostComments(
    @CurrentUser() user: CurrentUserType,
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.communityService.getPostComments(
      id,
      user.userId,
      parseInt(page ?? '1', 10),
      parseInt(limit ?? '10', 10),
    );
  }

  @Post('posts')
  @ApiOperation({ summary: 'Crear un post en un canal' })
  @ApiResponse({ status: 201, description: 'Post creado' })
  @ApiResponse({ status: 403, description: 'No tienes acceso a este canal' })
  createPost(
    @CurrentUser() user: CurrentUserType,
    @Body() dto: CreatePostDto,
  ) {
    return this.communityService.createPost(user.userId, dto);
  }

  @Patch('posts/:id/status')
  @ApiOperation({ summary: 'Cambiar estado de un post (published/paused). Solo el owner puede hacerlo.' })
  @ApiParam({ name: 'id', description: 'ID del post' })
  @ApiResponse({ status: 200, description: 'Estado del post actualizado' })
  @ApiResponse({ status: 403, description: 'Solo el creador del post puede cambiar su estado' })
  @ApiResponse({ status: 404, description: 'Post no encontrado' })
  updatePostStatus(
    @CurrentUser() user: CurrentUserType,
    @Param('id') id: string,
    @Body() dto: UpdatePostStatusDto,
  ) {
    return this.communityService.updatePostStatus(user.userId, id, dto.status);
  }

  @Delete('posts/:id')
  @ApiOperation({ summary: 'Borrado logico de un post (solo owner o admin)' })
  @ApiParam({ name: 'id', description: 'ID del post' })
  @ApiResponse({ status: 200, description: 'Post eliminado logicamente' })
  @ApiResponse({ status: 403, description: 'Solo el creador del post o un admin pueden eliminarlo' })
  @ApiResponse({ status: 404, description: 'Post no encontrado' })
  deletePost(
    @CurrentUser() user: CurrentUserType,
    @Param('id') id: string,
  ) {
    return this.communityService.deletePost(user.userId, user.role, id);
  }

  @Post('comments')
  @ApiOperation({ summary: 'Comentar en un post (valida acceso al canal del post)' })
  @ApiResponse({ status: 201, description: 'Comentario creado' })
  @ApiResponse({ status: 403, description: 'No tienes acceso al canal de este post' })
  @ApiResponse({ status: 404, description: 'Post no encontrado' })
  createComment(
    @CurrentUser() user: CurrentUserType,
    @Body() dto: CreateCommentDto,
  ) {
    return this.communityService.createComment(user.userId, dto);
  }

  @Delete('comments/:id')
  @ApiOperation({ summary: 'Borrado logico de un comentario (solo owner o admin)' })
  @ApiParam({ name: 'id', description: 'ID del comentario' })
  @ApiResponse({ status: 200, description: 'Comentario eliminado logicamente' })
  @ApiResponse({ status: 403, description: 'Solo el creador del comentario o un admin pueden eliminarlo' })
  @ApiResponse({ status: 404, description: 'Comentario no encontrado' })
  deleteComment(
    @CurrentUser() user: CurrentUserType,
    @Param('id') id: string,
  ) {
    return this.communityService.deleteComment(user.userId, user.role, id);
  }
}
