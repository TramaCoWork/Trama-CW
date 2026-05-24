import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { withoutDeleted } from '../common/filters/soft-delete.filter';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async softDeleteUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: withoutDeleted({ id: userId }),
      include: { profile: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const deletedAt = new Date();

    const [deletedUser] = await this.prisma.$transaction([
      this.prisma.user.update({
        where: withoutDeleted({ id: userId }),
        data: { deletedAt },
      }),
      this.prisma.professionalProfile.updateMany({
        where: withoutDeleted({ userId }),
        data: { deletedAt },
      }),
    ]);

    return deletedUser;
  }
}
