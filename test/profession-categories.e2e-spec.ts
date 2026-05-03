import { INestApplication } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const request = require('supertest');
import { createTestApp } from './test-app.factory';

describe('Profession Categories (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /profession-categories', () => {
    it('should return root categories', async () => {
      const res = await request(app.getHttpServer())
        .get('/profession-categories')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('GET /profession-categories/:parentId/children', () => {
    it('should return children of a category', async () => {
      // First get root categories to find a valid parentId
      const rootRes = await request(app.getHttpServer())
        .get('/profession-categories')
        .expect(200);

      if (rootRes.body.length > 0) {
        const parentId = rootRes.body[0].id;
        const res = await request(app.getHttpServer())
          .get(`/profession-categories/${parentId}/children`)
          .expect(200);

        expect(Array.isArray(res.body)).toBe(true);
      }
    });
  });
});
