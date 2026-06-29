import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { sanitizeMarkdown } from '../community/utils/sanitize-markdown';
import { CreateCommunityChannelDto } from './dto/create-community-channel.dto';
import { UpdateCommunityChannelDto } from './dto/update-community-channel.dto';
import { AdminCreateCommunityChannelPostDto } from './dto/admin-create-community-channel-post.dto';

@Injectable()
export class AdminChannelsService {
  constructor(private readonly prisma: PrismaService) {}

  async createChannel(dto: CreateCommunityChannelDto) {
    return this.prisma.communityChannel.create({
      data: {
        name: dto.name,
        description: dto.description,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async listChannels(page: number, limit: number) {
    const [data, total] = await Promise.all([
      this.prisma.communityChannel.findMany({
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.communityChannel.count(),
    ]);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
      },
    };
  }

  async getChannelById(id: string) {
    const channel = await this.prisma.communityChannel.findUnique({
      where: { id },
    });

    if (!channel) {
      throw new NotFoundException('Canal no encontrado');
    }

    return channel;
  }

  async updateChannel(id: string, dto: UpdateCommunityChannelDto) {
    await this.ensureChannelExists(id);

    return this.prisma.communityChannel.update({
      where: { id },
      data: dto,
    });
  }

  async deleteChannel(id: string) {
    await this.ensureChannelExists(id);
    await this.prisma.communityChannel.delete({ where: { id } });
    return { message: 'Canal eliminado' };
  }

  async addMember(channelId: string, userId: string) {
    await this.ensureChannelExists(channelId);

    try {
      return await this.prisma.communityChannelMember.create({
        data: {
          channelId,
          userId,
          accepted: true,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('El usuario ya es miembro del canal');
      }
      throw error;
    }
  }

  async removeMember(channelId: string, userId: string) {
    await this.ensureChannelExists(channelId);

    const member = await this.prisma.communityChannelMember.findUnique({
      where: {
        channelId_userId: {
          channelId,
          userId,
        },
      },
      select: { id: true },
    });

    if (!member) {
      throw new NotFoundException('Membresía no encontrada');
    }

    await this.prisma.communityChannelMember.delete({
      where: {
        channelId_userId: {
          channelId,
          userId,
        },
      },
    });

    return { message: 'Miembro eliminado' };
  }

  async listMembers(channelId: string, page: number, limit: number) {
    await this.ensureChannelExists(channelId);

    const [data, total] = await Promise.all([
      this.prisma.communityChannelMember.findMany({
        where: { channelId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.communityChannelMember.count({ where: { channelId } }),
    ]);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
      },
    };
  }

  async listChannelPosts(channelId: string, page: number, limit: number) {
    await this.ensureChannelExists(channelId);

    const [data, total] = await Promise.all([
      this.prisma.communityChannelPost.findMany({
        where: { channelId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.communityChannelPost.count({ where: { channelId } }),
    ]);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
      },
    };
  }

  async createChannelPost(
    channelId: string,
    dto: AdminCreateCommunityChannelPostDto,
  ) {
    await this.ensureChannelExists(channelId);

    return this.prisma.communityChannelPost.create({
      data: {
        channelId,
        userId: dto.userId,
        content: sanitizeMarkdown(dto.content),
      },
    });
  }

  async deleteChannelPost(channelId: string, postId: string) {
    const post = await this.prisma.communityChannelPost.findFirst({
      where: {
        id: postId,
        channelId,
      },
      select: { id: true },
    });

    if (!post) {
      throw new NotFoundException('Post no encontrado');
    }

    await this.prisma.communityChannelPost.update({
      where: { id: postId },
      data: { deletedAt: new Date() },
    });

    return { message: 'Post eliminado logicamente' };
  }

  async deleteChannelComment(channelId: string, commentId: string) {
    const comment = await this.prisma.communityChannelComment.findFirst({
      where: {
        id: commentId,
        post: {
          channelId,
        },
      },
      select: { id: true },
    });

    if (!comment) {
      throw new NotFoundException('Comentario no encontrado');
    }

    await this.prisma.communityChannelComment.update({
      where: { id: commentId },
      data: { deletedAt: new Date() },
    });

    return { message: 'Comentario eliminado logicamente' };
  }

  private async ensureChannelExists(channelId: string) {
    const channel = await this.prisma.communityChannel.findUnique({
      where: { id: channelId },
      select: { id: true },
    });

    if (!channel) {
      throw new NotFoundException('Canal no encontrado');
    }
  }
}
