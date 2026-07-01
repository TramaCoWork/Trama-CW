import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { PaginationDto } from '../common/dto/pagination.dto';
import { AdminChannelsService } from './admin-channels.service';
import { CreateCommunityChannelDto } from './dto/create-community-channel.dto';
import { UpdateCommunityChannelDto } from './dto/update-community-channel.dto';
import { CreateCommunityChannelMemberDto } from './dto/create-community-channel-member.dto';
import { AdminCreateCommunityChannelPostDto } from './dto/admin-create-community-channel-post.dto';

@ApiTags('Admin Channels')
@ApiBearerAuth()
@Controller('admin/channels')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminChannelsController {
  constructor(private readonly adminChannelsService: AdminChannelsService) {}

  @Post()
  @ApiOperation({ summary: 'Crear canal de comunidad' })
  @ApiResponse({ status: 201, description: 'Canal creado' })
  createChannel(
    @Body(new ValidationPipe({ whitelist: true, transform: true }))
    dto: CreateCommunityChannelDto,
  ) {
    return this.adminChannelsService.createChannel(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar canales de comunidad' })
  @ApiResponse({ status: 200, description: 'Lista paginada de canales' })
  getChannels(@Query() pagination: PaginationDto) {
    return this.adminChannelsService.listChannels(
      pagination.page,
      pagination.limit,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener canal por ID' })
  @ApiParam({ name: 'id', description: 'ID del canal' })
  @ApiResponse({ status: 200, description: 'Canal encontrado' })
  @ApiResponse({ status: 404, description: 'Canal no encontrado' })
  getChannelById(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminChannelsService.getChannelById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Actualizar canal por ID' })
  @ApiParam({ name: 'id', description: 'ID del canal' })
  @ApiResponse({ status: 200, description: 'Canal actualizado' })
  @ApiResponse({ status: 404, description: 'Canal no encontrado' })
  updateChannel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ValidationPipe({ whitelist: true, transform: true }))
    dto: UpdateCommunityChannelDto,
  ) {
    return this.adminChannelsService.updateChannel(id, dto);
  }

  @Delete(':id')
  @HttpCode(200)
  @ApiOperation({ summary: 'Eliminar canal por ID' })
  @ApiParam({ name: 'id', description: 'ID del canal' })
  @ApiResponse({ status: 200, description: 'Canal eliminado' })
  @ApiResponse({ status: 404, description: 'Canal no encontrado' })
  deleteChannel(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminChannelsService.deleteChannel(id);
  }

  @Post(':id/members')
  @ApiOperation({ summary: 'Agregar miembro a canal' })
  @ApiParam({ name: 'id', description: 'ID del canal' })
  @ApiResponse({ status: 201, description: 'Miembro agregado' })
  @ApiResponse({ status: 404, description: 'Canal no encontrado' })
  @ApiResponse({
    status: 409,
    description: 'El usuario ya es miembro del canal',
  })
  addMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ValidationPipe({ whitelist: true, transform: true }))
    dto: CreateCommunityChannelMemberDto,
  ) {
    return this.adminChannelsService.addMember(id, dto.userId);
  }

  @Delete(':id/members/:userId')
  @HttpCode(200)
  @ApiOperation({ summary: 'Eliminar miembro de canal' })
  @ApiParam({ name: 'id', description: 'ID del canal' })
  @ApiParam({ name: 'userId', description: 'ID del usuario miembro' })
  @ApiResponse({ status: 200, description: 'Miembro eliminado' })
  @ApiResponse({ status: 404, description: 'Membresía no encontrada' })
  removeMember(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    return this.adminChannelsService.removeMember(id, userId);
  }

  @Get(':id/members')
  @ApiOperation({ summary: 'Listar miembros del canal' })
  @ApiParam({ name: 'id', description: 'ID del canal' })
  @ApiResponse({
    status: 200,
    description: 'Lista paginada de miembros del canal',
  })
  @ApiResponse({ status: 404, description: 'Canal no encontrado' })
  getMembers(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.adminChannelsService.listMembers(
      id,
      pagination.page,
      pagination.limit,
    );
  }

  @Get(':id/posts')
  @ApiOperation({ summary: 'Listar posts del canal (incluye soft-deleted)' })
  @ApiParam({ name: 'id', description: 'ID del canal' })
  @ApiResponse({
    status: 200,
    description: 'Lista paginada de posts del canal',
  })
  @ApiResponse({ status: 404, description: 'Canal no encontrado' })
  getChannelPosts(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.adminChannelsService.listChannelPosts(
      id,
      pagination.page,
      pagination.limit,
    );
  }

  @Post(':id/posts')
  @ApiOperation({ summary: 'Crear post en canal en nombre de un userId' })
  @ApiParam({ name: 'id', description: 'ID del canal' })
  @ApiResponse({ status: 201, description: 'Post creado' })
  @ApiResponse({ status: 404, description: 'Canal no encontrado' })
  createChannelPost(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ValidationPipe({ whitelist: true, transform: true }))
    dto: AdminCreateCommunityChannelPostDto,
  ) {
    return this.adminChannelsService.createChannelPost(id, dto);
  }

  @Delete(':id/posts/:postId')
  @HttpCode(200)
  @ApiOperation({ summary: 'Borrado lógico de post del canal' })
  @ApiParam({ name: 'id', description: 'ID del canal' })
  @ApiParam({ name: 'postId', description: 'ID del post' })
  @ApiResponse({ status: 200, description: 'Post eliminado logicamente' })
  @ApiResponse({ status: 404, description: 'Post no encontrado' })
  deleteChannelPost(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('postId', ParseUUIDPipe) postId: string,
  ) {
    return this.adminChannelsService.deleteChannelPost(id, postId);
  }

  @Delete(':id/comments/:commentId')
  @HttpCode(200)
  @ApiOperation({ summary: 'Borrado lógico de comentario del canal' })
  @ApiParam({ name: 'id', description: 'ID del canal' })
  @ApiParam({ name: 'commentId', description: 'ID del comentario' })
  @ApiResponse({ status: 200, description: 'Comentario eliminado logicamente' })
  @ApiResponse({ status: 404, description: 'Comentario no encontrado' })
  deleteChannelComment(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('commentId', ParseUUIDPipe) commentId: string,
  ) {
    return this.adminChannelsService.deleteChannelComment(id, commentId);
  }
}
