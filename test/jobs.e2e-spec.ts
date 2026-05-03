import { INestApplication } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const request = require('supertest');
import { createTestApp, registerUser } from './test-app.factory';
import { cleanDatabase } from './clean-database';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Jobs (e2e)', () => {
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

  describe('GET /jobs', () => {
    it('should return jobs list', async () => {
      const res = await request(app.getHttpServer())
        .get('/jobs')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('POST /jobs/apply', () => {
    it('should apply to a job', async () => {
      const job = await prisma.job.create({
        data: { title: 'Test Job', description: 'A test', createdByAdmin: true, isActive: true },
      });

      const { access_token } = await registerUser(app, 'user@test.com', 'password123');

      const res = await request(app.getHttpServer())
        .post('/jobs/apply')
        .set('Authorization', `Bearer ${access_token}`)
        .send({ jobId: job.id })
        .expect(201);

      expect(res.body).toHaveProperty('id');
    });

    it('should reject without auth', async () => {
      await request(app.getHttpServer())
        .post('/jobs/apply')
        .send({ jobId: '00000000-0000-0000-0000-000000000000' })
        .expect(401);
    });
  });
});
