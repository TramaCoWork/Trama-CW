import { INestApplication } from '@nestjs/common';

const request = require('supertest');
import { createTestApp, registerUser } from './test-app.factory';
import { cleanDatabase } from './clean-database';

describe('Community (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  beforeEach(async () => {
    await cleanDatabase(app);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /community/posts', () => {
    it('should return posts', async () => {
      const { access_token } = await registerUser(
        app,
        'user@test.com',
        'password123',
      );

      const res = await request(app.getHttpServer())
        .get('/community/posts')
        .set('Authorization', `Bearer ${access_token}`)
        .expect(200);

      expect(Array.isArray(res.body.data)).toBe(true);
    });
  });

  describe('POST /community/posts', () => {
    it('should create a post (auth)', async () => {
      const { access_token } = await registerUser(
        app,
        'user@test.com',
        'password123',
      );

      const res = await request(app.getHttpServer())
        .post('/community/posts')
        .set('Authorization', `Bearer ${access_token}`)
        .send({ content: 'Hello community!' })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.content).toBe('Hello community!');
    });

    it('should reject without auth', async () => {
      await request(app.getHttpServer())
        .post('/community/posts')
        .send({ content: 'Hello' })
        .expect(401);
    });
  });

  describe('POST /community/comments', () => {
    it('should create a comment on a post', async () => {
      const { access_token } = await registerUser(
        app,
        'user@test.com',
        'password123',
      );

      const postRes = await request(app.getHttpServer())
        .post('/community/posts')
        .set('Authorization', `Bearer ${access_token}`)
        .send({ content: 'A post' })
        .expect(201);

      const res = await request(app.getHttpServer())
        .post('/community/comments')
        .set('Authorization', `Bearer ${access_token}`)
        .send({ postId: postRes.body.id, content: 'A comment' })
        .expect(201);

      expect(res.body).toHaveProperty('id');
    });
  });
});
