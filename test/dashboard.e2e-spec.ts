import { INestApplication } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const request = require('supertest');
import { createTestApp, registerUser, registerProfessional } from './test-app.factory';
import { cleanDatabase } from './clean-database';

describe('Dashboard (e2e)', () => {
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

  describe('GET /dashboard/me', () => {
    it('should return current user info', async () => {
      const { access_token } = await registerUser(app, 'user@test.com', 'password123');

      const res = await request(app.getHttpServer())
        .get('/dashboard/me')
        .set('Authorization', `Bearer ${access_token}`)
        .expect(200);

      expect(res.body).toHaveProperty('email', 'user@test.com');
    });
  });

  describe('GET /dashboard/contacts', () => {
    it('should return contacts for professional', async () => {
      const { access_token } = await registerProfessional(app, 'pro@test.com', 'password123');

      const res = await request(app.getHttpServer())
        .get('/dashboard/contacts')
        .set('Authorization', `Bearer ${access_token}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('GET /dashboard/jobs', () => {
    it('should return jobs list', async () => {
      const { access_token } = await registerUser(app, 'user@test.com', 'password123');

      const res = await request(app.getHttpServer())
        .get('/dashboard/jobs')
        .set('Authorization', `Bearer ${access_token}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });
  });
});
