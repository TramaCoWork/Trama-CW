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
    it('should return full taxonomy tree', async () => {
      const res = await request(app.getHttpServer())
        .get('/profession-categories')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('GET /profession-categories/rubros', () => {
    it('should return level-1 rubros', async () => {
      const res = await request(app.getHttpServer())
        .get('/profession-categories/rubros')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      if (res.body.length > 0) {
        expect(res.body[0]).toHaveProperty('id');
        expect(res.body[0]).toHaveProperty('slug');
        expect(res.body[0]).toHaveProperty('name');
      }
    });
  });

  describe('GET /profession-categories/:rubroId/professions', () => {
    it('should return professions grouped by sub-rubro', async () => {
      const rubrosRes = await request(app.getHttpServer())
        .get('/profession-categories/rubros')
        .expect(200);

      if (rubrosRes.body.length > 0) {
        const rubroId = rubrosRes.body[0].id;
        const res = await request(app.getHttpServer())
          .get(`/profession-categories/${rubroId}/professions`)
          .expect(200);

        expect(Array.isArray(res.body)).toBe(true);
        if (res.body.length > 0) {
          expect(res.body[0]).toHaveProperty('children');
        }
      }
    });

    it('should return 404 for invalid rubro', async () => {
      await request(app.getHttpServer())
        .get('/profession-categories/99999/professions')
        .expect(404);
    });
  });

  describe('GET /profession-categories/:parentId/children', () => {
    it('should return children of a category', async () => {
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
