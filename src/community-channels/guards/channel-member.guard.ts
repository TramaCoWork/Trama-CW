import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { CurrentUserType } from '../../auth/decorators/current-user.decorator';

@Injectable()
export class ChannelMemberGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      user: CurrentUserType;
      params: { id?: string };
    }>();

    const channelId = request.params.id;
    const userId = request.user?.userId;
    const role = request.user?.role;

    if (role === UserRole.admin) {
      return true;
    }

    if (!channelId || !userId) {
      throw new ForbiddenException('No autorizado para este canal');
    }

    const membership = await this.prisma.communityChannelMember.findUnique({
      where: {
        channelId_userId: {
          channelId,
          userId,
        },
      },
      select: { accepted: true },
    });

    if (!membership?.accepted) {
      throw new ForbiddenException('No autorizado para este canal');
    }

    return true;
  }
}
