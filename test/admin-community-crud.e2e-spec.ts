import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../src/prisma/prisma.service';
import { cleanDatabase } from './clean-database';
import { createTestApp, registerUser } from './test-app.factory';

const request = require('supertest');

describe('Admin Community CRUD (e2e)', () => {
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

  it('Admin list posts returns paginated data/meta and excludes soft-deleted rows', async () => {
    const admin = await registerUser(
      app,
      'admin-community-list@test.com',
      'password123',
      'admin',
    );

    await prisma.communityPost.createMany({
      data: [
        { userId: admin.userId, channelSlug: 'general', content: 'General 1' },
        { userId: admin.userId, channelSlug: 'general', content: 'General 2' },
        {
          userId: admin.userId,
          channelSlug: 'marketing',
          content: 'Marketing 1',
        },
        {
          userId: admin.userId,
          channelSlug: 'general',
          content: 'General deleted',
          deletedAt: new Date(),
        },
      ],
    });

    const res = await request(app.getHttpServer())
      .get('/admin/community/posts?page=1&limit=10&channelSlug=general')
      .set('Authorization', `Bearer ${admin.access_token}`)
      .expect(200);

    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data).toHaveLength(2);
    expect(
      res.body.data.every(
        (post: { deletedAt: Date | null }) => post.deletedAt === null,
      ),
    ).toBe(true);
    expect(res.body.meta).toMatchObject({
      page: 1,
      limit: 10,
      total: 2,
      totalPages: 1,
    });
  });

  it('Admin list posts returns an empty result for an unknown channelSlug', async () => {
    const admin = await registerUser(
      app,
      'admin-community-empty@test.com',
      'password123',
      'admin',
    );

    const res = await request(app.getHttpServer())
      .get('/admin/community/posts?page=1&limit=10&channelSlug=unknown-channel')
      .set('Authorization', `Bearer ${admin.access_token}`)
      .expect(200);

    expect(res.body.data).toEqual([]);
    expect(res.body.meta).toMatchObject({
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 0,
    });
  });

  it('Admin can create a comment with the JWT userId as author', async () => {
    const admin = await registerUser(
      app,
      'admin-community-comment@test.com',
      'password123',
      'admin',
    );

    const post = await prisma.communityPost.create({
      data: {
        userId: admin.userId,
        channelSlug: 'general',
        content: 'Post for admin comment',
      },
    });

    const res = await request(app.getHttpServer())
      .post(`/admin/community/posts/${post.id}/comments`)
      .set('Authorization', `Bearer ${admin.access_token}`)
      .send({ content: 'Admin comment content' })
      .expect(201);

    expect(res.body.postId).toBe(post.id);
    expect(res.body.userId).toBe(admin.userId);
    expect(res.body.content).toBe('Admin comment content');
  });

  it('Admin comment creation returns 404 for missing or soft-deleted posts', async () => {
    const admin = await registerUser(
      app,
      'admin-community-comment-404@test.com',
      'password123',
      'admin',
    );

    await request(app.getHttpServer())
      .post(
        '/admin/community/posts/00000000-0000-0000-0000-000000000000/comments',
      )
      .set('Authorization', `Bearer ${admin.access_token}`)
      .send({ content: 'Should fail' })
      .expect(404);

    const softDeletedPost = await prisma.communityPost.create({
      data: {
        userId: admin.userId,
        channelSlug: 'general',
        content: 'Soft deleted post',
        deletedAt: new Date(),
      },
    });

    await request(app.getHttpServer())
      .post(`/admin/community/posts/${softDeletedPost.id}/comments`)
      .set('Authorization', `Bearer ${admin.access_token}`)
      .send({ content: 'Should also fail' })
      .expect(404);

    const commentsCount = await prisma.communityComment.count();
    expect(commentsCount).toBe(0);
  });

  it('Admin post delete is soft-delete only and idempotent', async () => {
    const admin = await registerUser(
      app,
      'admin-community-delete-post@test.com',
      'password123',
      'admin',
    );

    const post = await prisma.communityPost.create({
      data: {
        userId: admin.userId,
        channelSlug: 'general',
        content: 'Post to delete',
      },
    });

    await request(app.getHttpServer())
      .delete(`/admin/community/posts/${post.id}`)
      .set('Authorization', `Bearer ${admin.access_token}`)
      .expect(200)
      .expect({ message: 'Post eliminado logicamente' });

    const afterFirstDelete = await prisma.communityPost.findUnique({
      where: { id: post.id },
    });
    expect(afterFirstDelete?.deletedAt).not.toBeNull();

    await request(app.getHttpServer())
      .delete(`/admin/community/posts/${post.id}`)
      .set('Authorization', `Bearer ${admin.access_token}`)
      .expect(200)
      .expect({ message: 'Post eliminado logicamente' });

    const afterSecondDelete = await prisma.communityPost.findUnique({
      where: { id: post.id },
    });
    expect(afterSecondDelete?.deletedAt).not.toBeNull();
  });

  it('Admin comment delete is soft-delete only and idempotent', async () => {
    const admin = await registerUser(
      app,
      'admin-community-delete-comment@test.com',
      'password123',
      'admin',
    );

    const post = await prisma.communityPost.create({
      data: {
        userId: admin.userId,
        channelSlug: 'general',
        content: 'Post for comment delete',
      },
    });

    const comment = await prisma.communityComment.create({
      data: {
        postId: post.id,
        userId: admin.userId,
        content: 'Comment to delete',
      },
    });

    await request(app.getHttpServer())
      .delete(`/admin/community/comments/${comment.id}`)
      .set('Authorization', `Bearer ${admin.access_token}`)
      .expect(200)
      .expect({ message: 'Comentario eliminado logicamente' });

    const afterFirstDelete = await prisma.communityComment.findUnique({
      where: { id: comment.id },
    });
    expect(afterFirstDelete?.deletedAt).not.toBeNull();

    await request(app.getHttpServer())
      .delete(`/admin/community/comments/${comment.id}`)
      .set('Authorization', `Bearer ${admin.access_token}`)
      .expect(200)
      .expect({ message: 'Comentario eliminado logicamente' });

    const afterSecondDelete = await prisma.communityComment.findUnique({
      where: { id: comment.id },
    });
    expect(afterSecondDelete?.deletedAt).not.toBeNull();
  });
});
