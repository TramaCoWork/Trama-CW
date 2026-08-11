import { ReactionType } from '@prisma/client';

export type ReactionCounts = Record<ReactionType, number>;

export function emptyReactionCounts(): ReactionCounts {
  return Object.values(ReactionType).reduce((acc, type) => {
    acc[type] = 0;
    return acc;
  }, {} as ReactionCounts);
}
