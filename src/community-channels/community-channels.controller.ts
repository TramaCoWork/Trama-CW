import {
  Body,
  Controller,
  Get,
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
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserType } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PaginationDto } from '../common/dto/pagination.dto';
import { CommunityChannelsService } from './community-channels.service';
import { ChannelMemberGuard } from './guards/channel-member.guard';
import { CreateCommunityChannelCommentDto } from './dto/create-community-channel-comment.dto';

@ApiTags('Community Channels')
@ApiBearerAuth()
@Controller('channels')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.professional)
export class CommunityChannelsController {
  constructor(
    private readonly communityChannelsService: CommunityChannelsService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Listar canales activos donde el usuario tiene membresía aceptada',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de canales disponibles para el profesional',
  })
  getChannels(@CurrentUser() user: CurrentUserType) {
    return this.communityChannelsService.getChannels(user.userId);
  }

  @Get(':id/posts')
  @UseGuards(ChannelMemberGuard)
  @ApiOperation({ summary: 'Listar posts activos de un canal' })
  @ApiParam({ name: 'id', description: 'ID del canal' })
  @ApiResponse({
    status: 200,
    description: 'Lista paginada de posts del canal',
  })
  @ApiResponse({
    status: 403,
    description: 'Usuario sin membresía aceptada en el canal',
  })
  getPosts(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.communityChannelsService.getChannelPosts(
      id,
      pagination.page,
      pagination.limit,
    );
  }

  @Get(':id/posts/:postId')
  @UseGuards(ChannelMemberGuard)
  @ApiOperation({ summary: 'Obtener un post activo de un canal' })
  @ApiParam({ name: 'id', description: 'ID del canal' })
  @ApiParam({ name: 'postId', description: 'ID del post' })
  @ApiResponse({ status: 200, description: 'Post encontrado' })
  @ApiResponse({
    status: 403,
    description: 'Usuario sin membresía aceptada en el canal',
  })
  @ApiResponse({ status: 404, description: 'Post no encontrado en el canal' })
  getPost(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('postId', ParseUUIDPipe) postId: string,
  ) {
    return this.communityChannelsService.getPost(id, postId);
  }

  @Get(':id/posts/:postId/comments')
  @UseGuards(ChannelMemberGuard)
  @ApiOperation({ summary: 'Listar comentarios activos de un post del canal' })
  @ApiParam({ name: 'id', description: 'ID del canal' })
  @ApiParam({ name: 'postId', description: 'ID del post' })
  @ApiResponse({ status: 200, description: 'Lista paginada de comentarios' })
  @ApiResponse({
    status: 403,
    description: 'Usuario sin membresía aceptada en el canal',
  })
  @ApiResponse({ status: 404, description: 'Post no encontrado en el canal' })
  getPostComments(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('postId', ParseUUIDPipe) postId: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.communityChannelsService.getPostComments(
      id,
      postId,
      pagination.page,
      pagination.limit,
    );
  }

  @Post(':id/posts/:postId/comments')
  @UseGuards(ChannelMemberGuard)
  @ApiOperation({ summary: 'Crear comentario en un post del canal' })
  @ApiParam({ name: 'id', description: 'ID del canal' })
  @ApiParam({ name: 'postId', description: 'ID del post' })
  @ApiResponse({ status: 201, description: 'Comentario creado' })
  @ApiResponse({
    status: 403,
    description: 'Usuario sin membresía aceptada en el canal',
  })
  @ApiResponse({ status: 404, description: 'Post no encontrado en el canal' })
  createComment(
    @CurrentUser() user: CurrentUserType,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('postId', ParseUUIDPipe) postId: string,
    @Body(new ValidationPipe({ whitelist: true, transform: true }))
    dto: CreateCommunityChannelCommentDto,
  ) {
    return this.communityChannelsService.createComment(
      id,
      postId,
      user.userId,
      dto.content,
    );
  }
}
