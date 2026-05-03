import { INestApplication } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const request = require('supertest');
import { createTestApp } from './test-app.factory';
import { cleanDatabase } from './clean-database';

describe('Search (e2e)', () => {
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

  it('GET /search should return results without filters', async () => {
    const res = await request(app.getHttpServer())
      .get('/search')
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /search?city=Buenos should filter by city', async () => {
    const res = await request(app.getHttpServer())
      .get('/search?city=Buenos')
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /search with multiple filters should work', async () => {
    const res = await request(app.getHttpServer())
      .get('/search?profession=Designer&modality=online')
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /search with price range should work', async () => {
    const res = await request(app.getHttpServer())
      .get('/search?price_min=100&price_max=500')
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
  });
});
