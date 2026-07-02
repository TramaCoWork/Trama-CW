import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserType } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AdminCommunityCommentDto } from './dto/admin-community-comment.dto';
import { AdminCommunityPaginationDto } from './dto/admin-community-pagination.dto';
import { AdminCommunityService } from './admin-community.service';

@ApiTags('Admin Community')
@ApiBearerAuth()
@Controller('admin/community')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminCommunityController {
  constructor(private readonly adminCommunityService: AdminCommunityService) {}

  @Get('posts')
  @ApiOperation({ summary: 'Listar posts de comunidad para moderacion admin' })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Numero de pagina (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Posts por pagina (default: 10)',
  })
  @ApiQuery({
    name: 'channelSlug',
    required: false,
    type: String,
    description: 'Filtrar por slug de canal',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista paginada de posts de comunidad',
  })
  getPosts(@Query() pagination: AdminCommunityPaginationDto) {
    return this.adminCommunityService.listPosts({
      page: pagination.page,
      limit: pagination.limit,
      channelSlug: pagination.channelSlug,
    });
  }

  @Get('posts/:id')
  @ApiOperation({
    summary: 'Obtener post de comunidad por ID para moderacion admin',
  })
  @ApiParam({ name: 'id', description: 'ID del post' })
  @ApiResponse({ status: 200, description: 'Post encontrado' })
  @ApiResponse({ status: 404, description: 'Post no encontrado' })
  getPostById(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminCommunityService.getAdminPostById(id);
  }

  @Post('posts/:id/comments')
  @ApiOperation({
    summary: 'Crear comentario admin sobre un post de comunidad',
  })
  @ApiParam({ name: 'id', description: 'ID del post' })
  @ApiResponse({ status: 201, description: 'Comentario creado' })
  @ApiResponse({ status: 404, description: 'Post no encontrado' })
  createComment(
    @CurrentUser() user: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ValidationPipe({ whitelist: true, transform: true }))
    dto: AdminCommunityCommentDto,
  ) {
    return this.adminCommunityService.createComment(
      id,
      user.userId,
      dto.content,
    );
  }

  @Delete('posts/:id')
  @HttpCode(200)
  @ApiOperation({ summary: 'Borrado logico admin de post de comunidad' })
  @ApiParam({ name: 'id', description: 'ID del post' })
  @ApiResponse({ status: 200, description: 'Post eliminado logicamente' })
  @ApiResponse({ status: 404, description: 'Post no encontrado' })
  deletePost(
    @CurrentUser() user: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.adminCommunityService.deletePost(id, user.userId);
  }

  @Delete('comments/:id')
  @HttpCode(200)
  @ApiOperation({ summary: 'Borrado logico admin de comentario de comunidad' })
  @ApiParam({ name: 'id', description: 'ID del comentario' })
  @ApiResponse({ status: 200, description: 'Comentario eliminado logicamente' })
  @ApiResponse({ status: 404, description: 'Comentario no encontrado' })
  deleteComment(
    @CurrentUser() user: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.adminCommunityService.deleteComment(id, user.userId);
  }
}
