import { INestApplication } from '@nestjs/common';

const request = require('supertest');
import { createTestApp } from './test-app.factory';

describe('External Job Postings (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /external-job-postings — authentication', () => {
    it('returns 401 when no JWT is provided', async () => {
      await request(app.getHttpServer())
        .get('/external-job-postings')
        .expect(401);
    });
  });
});
