import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../../src/prisma/prisma.service';
import { cleanDatabase } from '../clean-database';
import { createTestApp, registerUser } from '../test-app.factory';

const request = require('supertest');

describe('Admin Channels Catalog (e2e)', () => {
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

  it('creates, lists, gets, updates and hard-deletes channels', async () => {
    const admin = await registerUser(
      app,
      'admin-channels-catalog@test.com',
      'password123',
      'admin',
    );
    const professional = await registerUser(
      app,
      'professional-channels-catalog@test.com',
      'password123',
      'professional',
    );

    const createRes = await request(app.getHttpServer())
      .post('/admin/channels')
      .set('Authorization', `Bearer ${admin.access_token}`)
      .send({ name: 'Diseño', description: 'Canal de diseño', isActive: true })
      .expect(201);

    expect(createRes.body.name).toBe('Diseño');
    expect(createRes.body.description).toBe('Canal de diseño');

    const channelId = createRes.body.id as string;

    await prisma.communityChannelMember.create({
      data: {
        channelId,
        userId: professional.userId,
        accepted: true,
      },
    });

    const post = await prisma.communityChannelPost.create({
      data: {
        channelId,
        userId: professional.userId,
        content: 'Post a eliminar por cascada',
      },
    });

    await prisma.communityChannelComment.create({
      data: {
        postId: post.id,
        userId: professional.userId,
        content: 'Comentario a eliminar por cascada',
      },
    });

    const duplicateNameRes = await request(app.getHttpServer())
      .post('/admin/channels')
      .set('Authorization', `Bearer ${admin.access_token}`)
      .send({ name: 'Diseño', description: 'Mismo nombre permitido' })
      .expect(201);

    expect(duplicateNameRes.body.name).toBe('Diseño');

    const listRes = await request(app.getHttpServer())
      .get('/admin/channels?page=1&limit=20')
      .set('Authorization', `Bearer ${admin.access_token}`)
      .expect(200);

    expect(listRes.body.data).toHaveLength(2);
    expect(listRes.body.meta).toMatchObject({
      page: 1,
      limit: 20,
      total: 2,
      totalPages: 1,
    });

    const getRes = await request(app.getHttpServer())
      .get(`/admin/channels/${channelId}`)
      .set('Authorization', `Bearer ${admin.access_token}`)
      .expect(200);

    expect(getRes.body.id).toBe(channelId);

    const updateRes = await request(app.getHttpServer())
      .patch(`/admin/channels/${channelId}`)
      .set('Authorization', `Bearer ${admin.access_token}`)
      .send({ name: 'Diseño UX', isActive: false })
      .expect(200);

    expect(updateRes.body.name).toBe('Diseño UX');
    expect(updateRes.body.isActive).toBe(false);

    await request(app.getHttpServer())
      .delete(`/admin/channels/${channelId}`)
      .set('Authorization', `Bearer ${admin.access_token}`)
      .expect(200)
      .expect({ message: 'Canal eliminado' });

    const [channelCount, membersCount, postsCount, commentsCount] =
      await Promise.all([
        prisma.communityChannel.count({ where: { id: channelId } }),
        prisma.communityChannelMember.count({ where: { channelId } }),
        prisma.communityChannelPost.count({ where: { channelId } }),
        prisma.communityChannelComment.count({ where: { postId: post.id } }),
      ]);

    expect(channelCount).toBe(0);
    expect(membersCount).toBe(0);
    expect(postsCount).toBe(0);
    expect(commentsCount).toBe(0);

    await request(app.getHttpServer())
      .get(`/admin/channels/${channelId}`)
      .set('Authorization', `Bearer ${admin.access_token}`)
      .expect(404);

    await request(app.getHttpServer())
      .patch(`/admin/channels/${channelId}`)
      .set('Authorization', `Bearer ${admin.access_token}`)
      .send({ name: 'No existe' })
      .expect(404);

    await request(app.getHttpServer())
      .delete(`/admin/channels/${channelId}`)
      .set('Authorization', `Bearer ${admin.access_token}`)
      .expect(404);
  });
});
