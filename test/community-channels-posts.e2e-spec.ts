import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../src/prisma/prisma.service';
import { cleanDatabase } from './clean-database';
import { createTestApp, registerUser } from './test-app.factory';

const request = require('supertest');

async function createProfessionalWithRubro(
  app: INestApplication,
  email: string,
  channelSlug: string,
): Promise<{ access_token: string; userId: string }> {
  const professional = await registerUser(
    app,
    email,
    'password123',
    'professional',
  );
  const prisma = app.get(PrismaService);

  const rubro = await prisma.professionCategory.upsert({
    where: { slug: channelSlug },
    update: {
      name: `Rubro ${channelSlug}`,
      level: 1,
      parentId: null,
      order: 0,
    },
    create: {
      slug: channelSlug,
      name: `Rubro ${channelSlug}`,
      level: 1,
      order: 0,
    },
  });

  await prisma.professionalProfile.create({
    data: {
      userId: professional.userId,
      name: `Professional ${channelSlug}`,
      services: [],
      rubroId: rubro.id,
    },
  });

  return professional;
}

describe('Community channels/posts/comments (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await cleanDatabase(app);
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /community/channels returns distinct active slugs and enforces admin-only', async () => {
    const admin = await registerUser(
      app,
      'admin-channels@test.com',
      'password123',
      'admin',
    );
    const client = await registerUser(
      app,
      'client-channels@test.com',
      'password123',
      'client',
    );

    await prisma.communityPost.createMany({
      data: [
        { userId: admin.userId, channelSlug: 'design', content: 'Design A' },
        { userId: admin.userId, channelSlug: 'design', content: 'Design B' },
        {
          userId: admin.userId,
          channelSlug: 'marketing',
          content: 'Marketing A',
        },
        {
          userId: admin.userId,
          channelSlug: 'ghost',
          content: 'Ghost only deleted',
          deletedAt: new Date(),
        },
        {
          userId: admin.userId,
          channelSlug: 'paused-only',
          content: 'Paused post',
          status: 'paused',
        },
      ],
    });

    const adminRes = await request(app.getHttpServer())
      .get('/community/channels')
      .set('Authorization', `Bearer ${admin.access_token}`)
      .expect(200);

    expect(adminRes.body).toEqual({ data: ['design', 'marketing'] });

    await request(app.getHttpServer())
      .get('/community/channels')
      .set('Authorization', `Bearer ${client.access_token}`)
      .expect(403);
  });

  it('GET /community/channels/:slug/posts enforces access rules, excludes soft-deleted and paginates', async () => {
    const admin = await registerUser(
      app,
      'admin-posts@test.com',
      'password123',
      'admin',
    );
    const matchingProfessional = await createProfessionalWithRubro(
      app,
      'pro-design@test.com',
      'design',
    );
    const otherProfessional = await createProfessionalWithRubro(
      app,
      'pro-marketing@test.com',
      'marketing',
    );
    const client = await registerUser(
      app,
      'client-posts@test.com',
      'password123',
      'client',
    );

    await prisma.communityPost.createMany({
      data: [
        {
          userId: admin.userId,
          channelSlug: 'design',
          content: 'Design visible 1',
        },
        {
          userId: admin.userId,
          channelSlug: 'design',
          content: 'Design visible 2',
        },
        {
          userId: admin.userId,
          channelSlug: 'general',
          content: 'General visible',
        },
        {
          userId: admin.userId,
          channelSlug: 'design',
          content: 'Design deleted',
          deletedAt: new Date(),
        },
      ],
    });

    const adminRes = await request(app.getHttpServer())
      .get('/community/channels/design/posts?page=1&limit=20')
      .set('Authorization', `Bearer ${admin.access_token}`)
      .expect(200);

    expect(adminRes.body.data).toHaveLength(2);
    expect(
      adminRes.body.data.every(
        (post: { channelSlug: string }) => post.channelSlug === 'design',
      ),
    ).toBe(true);
    expect(adminRes.body.meta).toMatchObject({
      page: 1,
      limit: 20,
      total: 2,
      totalPages: 1,
    });

    const matchingProRes = await request(app.getHttpServer())
      .get('/community/channels/design/posts?page=1&limit=20')
      .set('Authorization', `Bearer ${matchingProfessional.access_token}`)
      .expect(200);

    const matchingChannels = matchingProRes.body.data.map(
      (post: { channelSlug: string }) => post.channelSlug,
    );
    expect(matchingChannels).toEqual(
      expect.arrayContaining(['design', 'general']),
    );
    expect(matchingChannels).not.toContain('marketing');

    const clientRes = await request(app.getHttpServer())
      .get('/community/channels/general/posts?page=1&limit=20')
      .set('Authorization', `Bearer ${client.access_token}`)
      .expect(200);

    expect(
      clientRes.body.data.every(
        (post: { channelSlug: string }) => post.channelSlug === 'general',
      ),
    ).toBe(true);

    await request(app.getHttpServer())
      .get('/community/channels/design/posts')
      .set('Authorization', `Bearer ${otherProfessional.access_token}`)
      .expect(403);

    await request(app.getHttpServer())
      .get('/community/channels/design/posts')
      .expect(401);

    await request(app.getHttpServer())
      .get('/community/channels/design/posts?page=abc&limit=20')
      .set('Authorization', `Bearer ${admin.access_token}`)
      .expect(400);
  });

  it('GET /community/posts/:id/comments returns active comments ordered ASC and validates parent/access', async () => {
    const admin = await registerUser(
      app,
      'admin-comments@test.com',
      'password123',
      'admin',
    );
    const professional = await createProfessionalWithRubro(
      app,
      'pro-comments@test.com',
      'design',
    );

    const post = await prisma.communityPost.create({
      data: {
        userId: admin.userId,
        channelSlug: 'design',
        content: 'Design post for comments',
      },
    });

    await prisma.communityComment.createMany({
      data: [
        {
          postId: post.id,
          userId: admin.userId,
          content: 'Second comment',
          createdAt: new Date('2024-01-01T12:00:00.000Z'),
        },
        {
          postId: post.id,
          userId: admin.userId,
          content: 'First comment',
          createdAt: new Date('2024-01-01T10:00:00.000Z'),
        },
        {
          postId: post.id,
          userId: admin.userId,
          content: 'Deleted comment',
          deletedAt: new Date(),
          createdAt: new Date('2024-01-01T11:00:00.000Z'),
        },
      ],
    });

    const commentsRes = await request(app.getHttpServer())
      .get(`/community/posts/${post.id}/comments?page=1&limit=20`)
      .set('Authorization', `Bearer ${professional.access_token}`)
      .expect(200);

    expect(commentsRes.body.data).toHaveLength(2);
    expect(commentsRes.body.data[0].content).toBe('First comment');
    expect(commentsRes.body.data[1].content).toBe('Second comment');
    expect(commentsRes.body.meta).toMatchObject({
      page: 1,
      limit: 20,
      total: 2,
      totalPages: 1,
    });

    await request(app.getHttpServer())
      .get(
        '/community/posts/00000000-0000-0000-0000-000000000000/comments?page=1&limit=20',
      )
      .set('Authorization', `Bearer ${admin.access_token}`)
      .expect(404);

    const softDeletedPost = await prisma.communityPost.create({
      data: {
        userId: admin.userId,
        channelSlug: 'general',
        content: 'Soft deleted parent',
        deletedAt: new Date(),
      },
    });

    await request(app.getHttpServer())
      .get(`/community/posts/${softDeletedPost.id}/comments?page=1&limit=20`)
      .set('Authorization', `Bearer ${admin.access_token}`)
      .expect(404);

    await request(app.getHttpServer())
      .get(`/community/posts/${post.id}/comments?page=1&limit=invalid`)
      .set('Authorization', `Bearer ${admin.access_token}`)
      .expect(400);
  });
});
