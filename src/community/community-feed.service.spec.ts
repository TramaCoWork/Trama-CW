import { BadRequestException } from '@nestjs/common';
import { PostStatus } from '@prisma/client';
import { CommunityService } from './community.service';

describe('CommunityService.getFeed', () => {
  const prisma = {
    professionalProfile: { findUnique: jest.fn() },
    communityChannelMember: { findMany: jest.fn() },
    communityPost: { findMany: jest.fn() },
    communityChannelPost: { findMany: jest.fn() },
    user: { findMany: jest.fn() },
  };

  let service: CommunityService;

  const d = (iso: string) => new Date(iso);

  const communityPost = (over: Partial<any> = {}) => ({
    id: 'cp-1',
    userId: 'author-1',
    channelSlug: 'general',
    status: PostStatus.published,
    content: 'hola',
    createdAt: d('2026-07-20T10:00:00.000Z'),
    updatedAt: d('2026-07-20T10:00:00.000Z'),
    user: {
      id: 'author-1',
      email: 'a@x.com',
      profile: { name: 'Autor Uno' },
    },
    _count: { comments: 2 },
    ...over,
  });

  const channelPost = (over: Partial<any> = {}) => ({
    id: 'chp-1',
    userId: 'author-2',
    channelId: 'group-1',
    status: PostStatus.published,
    content: 'grupo',
    createdAt: d('2026-07-21T10:00:00.000Z'),
    updatedAt: d('2026-07-21T10:00:00.000Z'),
    _count: { comments: 0 },
    ...over,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CommunityService(prisma as any);

    // Default: usuario con rubro "abogacia" y membresia aceptada en "group-1".
    prisma.professionalProfile.findUnique.mockResolvedValue({
      rubro: { slug: 'abogacia', name: 'Abogacia' },
    });
    prisma.communityChannelMember.findMany.mockResolvedValue([
      { channel: { id: 'group-1', name: 'Grupo Uno' } },
    ]);
    prisma.communityPost.findMany.mockResolvedValue([]);
    prisma.communityChannelPost.findMany.mockResolvedValue([]);
    prisma.user.findMany.mockResolvedValue([]);
  });

  it('mezcla community y grupos ordenando por fecha desc (mas nuevo primero)', async () => {
    prisma.communityPost.findMany.mockResolvedValue([communityPost()]); // 07-20
    prisma.communityChannelPost.findMany.mockResolvedValue([channelPost()]); // 07-21
    prisma.user.findMany.mockResolvedValue([
      { id: 'author-2', email: 'b@x.com', profile: { name: 'Autor Dos' } },
    ]);

    const res = await service.getFeed('me', undefined, 20);

    expect(res.data.map((p) => p.id)).toEqual(['chp-1', 'cp-1']);
    expect(res.data[0].type).toBe('channel');
    expect(res.data[0].channelName).toBe('Grupo Uno');
    expect(res.data[0].author).toEqual({
      userId: 'author-2',
      name: 'Autor Dos',
      email: 'b@x.com',
    });
    expect(res.data[1].type).toBe('community');
    expect(res.data[1].channelName).toBe('General');
    expect(res.hasMore).toBe(false);
    expect(res.nextCursor).toBeNull();
  });

  it('consulta solo scopes accesibles: general + rubro + grupos con membresia', async () => {
    await service.getFeed('me', undefined, 20);

    expect(prisma.communityPost.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          channelSlug: { in: ['general', 'abogacia'] },
          deletedAt: null,
          status: PostStatus.published,
        }),
      }),
    );
    expect(prisma.communityChannelPost.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          channelId: { in: ['group-1'] },
          deletedAt: null,
          status: PostStatus.published,
        }),
      }),
    );
  });

  it('no consulta grupos si el usuario no tiene membresias', async () => {
    prisma.communityChannelMember.findMany.mockResolvedValue([]);

    await service.getFeed('me', undefined, 20);

    expect(prisma.communityChannelPost.findMany).not.toHaveBeenCalled();
  });

  it('setea hasMore y nextCursor cuando hay mas resultados que el limit', async () => {
    // limit = 1, pero traemos 2 community (take = limit + 1)
    prisma.communityPost.findMany.mockResolvedValue([
      communityPost({ id: 'cp-new', createdAt: d('2026-07-20T12:00:00.000Z') }),
      communityPost({ id: 'cp-old', createdAt: d('2026-07-20T09:00:00.000Z') }),
    ]);

    const res = await service.getFeed('me', undefined, 1);

    expect(res.data).toHaveLength(1);
    expect(res.data[0].id).toBe('cp-new');
    expect(res.hasMore).toBe(true);
    expect(res.nextCursor).toBeTruthy();

    // El cursor decodifica al ultimo item devuelto (cp-new).
    const decoded = JSON.parse(
      Buffer.from(res.nextCursor as string, 'base64').toString('utf8'),
    );
    expect(decoded).toEqual({
      t: '2026-07-20T12:00:00.000Z',
      id: 'cp-new',
    });
  });

  it('aplica el cursor como filtro keyset (createdAt, id) en ambas tablas', async () => {
    const cursor = Buffer.from(
      JSON.stringify({ t: '2026-07-20T12:00:00.000Z', id: 'cp-new' }),
    ).toString('base64');

    await service.getFeed('me', cursor, 20);

    const expectedOr = {
      OR: [
        { createdAt: { lt: new Date('2026-07-20T12:00:00.000Z') } },
        { createdAt: new Date('2026-07-20T12:00:00.000Z'), id: { lt: 'cp-new' } },
      ],
    };

    expect(prisma.communityPost.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining(expectedOr),
      }),
    );
    expect(prisma.communityChannelPost.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining(expectedOr),
      }),
    );
  });

  it('rechaza un cursor invalido con BadRequestException', async () => {
    await expect(service.getFeed('me', 'no-es-base64-valido', 20)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('desempata por id descendente cuando createdAt es igual', async () => {
    const sameDate = d('2026-07-20T10:00:00.000Z');
    prisma.communityPost.findMany.mockResolvedValue([
      communityPost({ id: 'aaa', createdAt: sameDate }),
      communityPost({ id: 'zzz', createdAt: sameDate }),
    ]);

    const res = await service.getFeed('me', undefined, 20);

    expect(res.data.map((p) => p.id)).toEqual(['zzz', 'aaa']);
  });
});
