import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../../src/prisma/prisma.service';
import { cleanDatabase } from '../clean-database';
import { createTestApp, registerUser } from '../test-app.factory';

const request = require('supertest');

describe('Professional Channels Content (e2e)', () => {
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

  it('lists active posts/comments only and creates comment with currentUser.userId', async () => {
    const professional = await registerUser(
      app,
      'professional-content@test.com',
      'password123',
      'professional',
    );
    const otherProfessional = await registerUser(
      app,
      'professional-content-other@test.com',
      'password123',
      'professional',
    );

    const channel = await prisma.communityChannel.create({
      data: {
        name: 'Canal contenido',
        isActive: true,
      },
    });

    await prisma.communityChannelMember.create({
      data: {
        channelId: channel.id,
        userId: professional.userId,
        accepted: true,
      },
    });

    const activePost = await prisma.communityChannelPost.create({
      data: {
        channelId: channel.id,
        userId: otherProfessional.userId,
        content: 'Post activo',
      },
    });

    await prisma.communityChannelPost.create({
      data: {
        channelId: channel.id,
        userId: otherProfessional.userId,
        content: 'Post eliminado',
        deletedAt: new Date(),
      },
    });

    await prisma.communityChannelComment.createMany({
      data: [
        {
          postId: activePost.id,
          userId: otherProfessional.userId,
          content: 'Comentario activo',
        },
        {
          postId: activePost.id,
          userId: otherProfessional.userId,
          content: 'Comentario eliminado',
          deletedAt: new Date(),
        },
      ],
    });

    const postsRes = await request(app.getHttpServer())
      .get(`/channels/${channel.id}/posts?page=1&limit=20`)
      .set('Authorization', `Bearer ${professional.access_token}`)
      .expect(200);

    expect(postsRes.body.data).toHaveLength(1);
    expect(postsRes.body.data[0].id).toBe(activePost.id);

    const commentsRes = await request(app.getHttpServer())
      .get(
        `/channels/${channel.id}/posts/${activePost.id}/comments?page=1&limit=20`,
      )
      .set('Authorization', `Bearer ${professional.access_token}`)
      .expect(200);

    expect(commentsRes.body.data).toHaveLength(1);
    expect(commentsRes.body.data[0].content).toBe('Comentario activo');

    const createCommentRes = await request(app.getHttpServer())
      .post(`/channels/${channel.id}/posts/${activePost.id}/comments`)
      .set('Authorization', `Bearer ${professional.access_token}`)
      .send({ content: 'Nuevo comentario profesional' })
      .expect(201);

    expect(createCommentRes.body.postId).toBe(activePost.id);
    expect(createCommentRes.body.userId).toBe(professional.userId);
    expect(createCommentRes.body.content).toBe('Nuevo comentario profesional');
  });
});
