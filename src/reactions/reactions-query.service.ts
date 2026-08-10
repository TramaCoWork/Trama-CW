import { Injectable } from '@nestjs/common';
import { ReactionTargetType, ReactionType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ReactionCounts, emptyReactionCounts } from './utils/reaction-counts';

export type WithReactions<T> = T & {
  reactions: ReactionCounts;
  myReaction: ReactionType | null;
};

@Injectable()
export class ReactionsQueryService {
  constructor(private readonly prisma: PrismaService) {}

  async attach<T extends { id: string }>(
    targetType: ReactionTargetType,
    items: T[],
    userId: string,
  ): Promise<WithReactions<T>[]> {
    if (items.length === 0) {
      return [];
    }

    const targetIds = items.map((item) => item.id);

    const [grouped, mine] = await Promise.all([
      this.prisma.reaction.groupBy({
        by: ['targetId', 'type'],
        where: { targetType, targetId: { in: targetIds } },
        _count: { _all: true },
      }),
      this.prisma.reaction.findMany({
        where: { targetType, targetId: { in: targetIds }, userId },
        select: { targetId: true, type: true },
      }),
    ]);

    const countsMap = new Map<string, ReactionCounts>();
    for (const row of grouped) {
      const counts = countsMap.get(row.targetId) ?? emptyReactionCounts();
      counts[row.type] = row._count._all;
      countsMap.set(row.targetId, counts);
    }

    const mineMap = new Map<string, ReactionType>(
      mine.map((row) => [row.targetId, row.type]),
    );

    return items.map((item) => ({
      ...item,
      reactions: countsMap.get(item.id) ?? emptyReactionCounts(),
      myReaction: mineMap.get(item.id) ?? null,
    }));
  }

  async getOne(
    targetType: ReactionTargetType,
    targetId: string,
    userId: string,
  ): Promise<{ reactions: ReactionCounts; myReaction: ReactionType | null }> {
    const [item] = await this.attach(targetType, [{ id: targetId }], userId);
    return { reactions: item.reactions, myReaction: item.myReaction };
  }
}
