import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CommunityService } from './community.service';
import { CreatePostDto } from './dto/create-post.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserType } from '../auth/decorators/current-user.decorator';

@ApiTags('Community')
@Controller('community')
export class CommunityController {
  constructor(private readonly communityService: CommunityService) {}

  @Get('posts')
  @ApiOperation({ summary: 'Listar posts de la comunidad' })
  @ApiResponse({ status: 200, description: 'Lista de posts' })
  async getPosts() {
    return this.communityService.getPosts();
  }

  @Post('posts')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Crear un post en la comunidad' })
  @ApiResponse({ status: 201, description: 'Post creado' })
  async createPost(
    @CurrentUser() user: CurrentUserType,
    @Body() dto: CreatePostDto,
  ) {
    return this.communityService.createPost(user.userId, dto);
  }

  @Post('comments')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Comentar en un post' })
  @ApiResponse({ status: 201, description: 'Comentario creado' })
  async createComment(
    @CurrentUser() user: CurrentUserType,
    @Body() dto: CreateCommentDto,
  ) {
    return this.communityService.createComment(user.userId, dto);
  }
}
