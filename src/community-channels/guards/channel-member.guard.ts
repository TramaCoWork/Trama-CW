import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EntitlementsService } from '../../entitlements/entitlements.service';
import type { CurrentUserType } from '../../auth/decorators/current-user.decorator';

@Injectable()
export class ChannelMemberGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly entitlements: EntitlementsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      user: CurrentUserType;
      params: { id?: string };
    }>();

    const channelId = request.params.id;
    const userId = request.user?.userId;
    const isAdmin =
      request.user?.roles?.some(
        (role) => role.type === 'admin' || role.name === 'admin',
      ) ?? false;

    if (isAdmin) {
      return true;
    }

    if (!channelId || !userId) {
      throw new ForbiddenException('No autorizado para este canal');
    }

    // Los grupos (channels) son exclusivos del plan pago.
    const isPaid = await this.entitlements.isPaid(userId);
    if (!isPaid) {
      throw new ForbiddenException(
        'Los grupos son exclusivos del plan pago. Con el plan gratuito solo tenés acceso al canal general.',
      );
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
