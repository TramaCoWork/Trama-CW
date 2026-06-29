import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../../src/prisma/prisma.service';
import { cleanDatabase } from '../clean-database';
import { createTestApp, registerUser } from '../test-app.factory';

const request = require('supertest');

describe('Admin Channels Moderation (e2e)', () => {
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

  it('creates post, lists all posts including soft-deleted, soft-deletes post/comment, and returns 404 for wrong channel', async () => {
    const admin = await registerUser(
      app,
      'admin-moderation@test.com',
      'password123',
      'admin',
    );
    const professional = await registerUser(
      app,
      'professional-moderation@test.com',
      'password123',
      'professional',
    );

    const channelA = await prisma.communityChannel.create({
      data: { name: 'Canal A', isActive: true },
    });
    const channelB = await prisma.communityChannel.create({
      data: { name: 'Canal B', isActive: true },
    });

    const createPostRes = await request(app.getHttpServer())
      .post(`/admin/channels/${channelA.id}/posts`)
      .set('Authorization', `Bearer ${admin.access_token}`)
      .send({ userId: professional.userId, content: 'Post admin en canal A' })
      .expect(201);

    expect(createPostRes.body.channelId).toBe(channelA.id);
    expect(createPostRes.body.userId).toBe(professional.userId);

    const postId = createPostRes.body.id as string;

    const comment = await prisma.communityChannelComment.create({
      data: {
        postId,
        userId: professional.userId,
        content: 'Comentario en canal A',
      },
    });

    await request(app.getHttpServer())
      .delete(`/admin/channels/${channelA.id}/posts/${postId}`)
      .set('Authorization', `Bearer ${admin.access_token}`)
      .expect(200)
      .expect({ message: 'Post eliminado logicamente' });

    const listRes = await request(app.getHttpServer())
      .get(`/admin/channels/${channelA.id}/posts?page=1&limit=20`)
      .set('Authorization', `Bearer ${admin.access_token}`)
      .expect(200);

    expect(listRes.body.data).toHaveLength(1);
    expect(listRes.body.data[0].id).toBe(postId);
    expect(listRes.body.data[0].deletedAt).not.toBeNull();

    await request(app.getHttpServer())
      .delete(`/admin/channels/${channelA.id}/comments/${comment.id}`)
      .set('Authorization', `Bearer ${admin.access_token}`)
      .expect(200)
      .expect({ message: 'Comentario eliminado logicamente' });

    const deletedComment = await prisma.communityChannelComment.findUnique({
      where: { id: comment.id },
    });
    expect(deletedComment?.deletedAt).not.toBeNull();

    await request(app.getHttpServer())
      .delete(`/admin/channels/${channelB.id}/posts/${postId}`)
      .set('Authorization', `Bearer ${admin.access_token}`)
      .expect(404);

    await request(app.getHttpServer())
      .delete(`/admin/channels/${channelB.id}/comments/${comment.id}`)
      .set('Authorization', `Bearer ${admin.access_token}`)
      .expect(404);
  });
});
