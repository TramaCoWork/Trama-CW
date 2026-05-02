import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePostDto } from './dto/create-post.dto';
import { CreateCommentDto } from './dto/create-comment.dto';

@Injectable()
export class CommunityService {
  constructor(private readonly prisma: PrismaService) {}

  async getPosts() {
    return this.prisma.communityPost.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, email: true } },
        _count: { select: { comments: true } },
      },
    });
  }

  async createPost(userId: string, dto: CreatePostDto) {
    return this.prisma.communityPost.create({
      data: {
        userId,
        content: dto.content,
      },
    });
  }

  async createComment(userId: string, dto: CreateCommentDto) {
    const post = await this.prisma.communityPost.findUnique({
      where: { id: dto.postId },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    return this.prisma.communityComment.create({
      data: {
        postId: dto.postId,
        userId,
        content: dto.content,
      },
    });
  }
}
