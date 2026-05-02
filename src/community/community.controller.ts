import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { CommunityService } from './community.service';
import { CreatePostDto } from './dto/create-post.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { CurrentUserType } from '../auth/decorators/current-user.decorator';

@Controller('community')
export class CommunityController {
  constructor(private readonly communityService: CommunityService) {}

  @Get('posts')
  async getPosts() {
    return this.communityService.getPosts();
  }

  @Post('posts')
  @UseGuards(JwtAuthGuard)
  async createPost(
    @CurrentUser() user: CurrentUserType,
    @Body() dto: CreatePostDto,
  ) {
    return this.communityService.createPost(user.userId, dto);
  }

  @Post('comments')
  @UseGuards(JwtAuthGuard)
  async createComment(
    @CurrentUser() user: CurrentUserType,
    @Body() dto: CreateCommentDto,
  ) {
    return this.communityService.createComment(user.userId, dto);
  }
}
