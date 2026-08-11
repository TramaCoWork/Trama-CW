import { ReactionTargetType, ReactionType } from '@prisma/client';
import { ReactionsQueryService } from './reactions-query.service';
import { emptyReactionCounts } from './utils/reaction-counts';

describe('reaction-counts util', () => {
  it('devuelve todas las claves del enum en 0', () => {
    expect(emptyReactionCounts()).toEqual({
      LIKE: 0, LOVE: 0, LAUGH: 0, WOW: 0, SAD: 0, DISLIKE: 0,
    });
  });
});

describe('ReactionsQueryService.attach', () => {
  const prisma = {
    reaction: { groupBy: jest.fn(), findMany: jest.fn() },
  };
  let service: ReactionsQueryService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ReactionsQueryService(prisma as any);
    prisma.reaction.groupBy.mockResolvedValue([]);
    prisma.reaction.findMany.mockResolvedValue([]);
  });

  it('con lista vacía no consulta y devuelve []', async () => {
    const res = await service.attach(ReactionTargetType.community_post, [], 'me');
    expect(res).toEqual([]);
    expect(prisma.reaction.groupBy).not.toHaveBeenCalled();
  });

  it('cuelga conteos por tipo (claves faltantes en 0) y myReaction', async () => {
    prisma.reaction.groupBy.mockResolvedValue([
      { targetId: 'p1', type: ReactionType.LIKE, _count: { _all: 12 } },
      { targetId: 'p1', type: ReactionType.LOVE, _count: { _all: 3 } },
    ]);
    prisma.reaction.findMany.mockResolvedValue([
      { targetId: 'p1', type: ReactionType.LIKE },
    ]);

    const res = await service.attach(
      ReactionTargetType.community_post,
      [{ id: 'p1', content: 'x' }, { id: 'p2', content: 'y' }],
      'me',
    );

    expect(res[0]).toMatchObject({
      id: 'p1',
      content: 'x',
      reactions: { LIKE: 12, LOVE: 3, LAUGH: 0, WOW: 0, SAD: 0, DISLIKE: 0 },
      myReaction: ReactionType.LIKE,
    });
    expect(res[1]).toMatchObject({
      id: 'p2',
      reactions: { LIKE: 0, LOVE: 0, LAUGH: 0, WOW: 0, SAD: 0, DISLIKE: 0 },
      myReaction: null,
    });
  });
});
