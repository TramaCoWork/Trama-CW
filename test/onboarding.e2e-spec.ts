import { INestApplication } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const request = require('supertest');
import { createTestApp, registerProfessional } from './test-app.factory';
import { cleanDatabase } from './clean-database';

describe('Onboarding (e2e)', () => {
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

  describe('GET /onboarding/checklist', () => {
    it('should return checklist for professional', async () => {
      const { access_token } = await registerProfessional(app, 'pro@test.com', 'password123');

      const res = await request(app.getHttpServer())
        .get('/onboarding/checklist')
        .set('Authorization', `Bearer ${access_token}`)
        .expect(200);

      expect(res.body).toHaveProperty('items');
      expect(res.body).toHaveProperty('completionPct');
      expect(res.body).toHaveProperty('currentStep');
      expect(Array.isArray(res.body.items)).toBe(true);
    });

    it('should reject without auth', async () => {
      await request(app.getHttpServer())
        .get('/onboarding/checklist')
        .expect(401);
    });
  });

  describe('POST /onboarding/complete', () => {
    it('should reject if profile is not complete enough', async () => {
      const { access_token } = await registerProfessional(app, 'pro@test.com', 'password123');

      await request(app.getHttpServer())
        .post('/onboarding/complete')
        .set('Authorization', `Bearer ${access_token}`)
        .expect(400);
    });
  });
});
