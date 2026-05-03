import { INestApplication } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const request = require('supertest');
import { createTestApp, registerUser } from './test-app.factory';
import { cleanDatabase } from './clean-database';

describe('Payments (e2e)', () => {
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

  describe('POST /payments/create', () => {
    it('should create a payment', async () => {
      const { access_token } = await registerUser(app, 'user@test.com', 'password123');

      const res = await request(app.getHttpServer())
        .post('/payments/create')
        .set('Authorization', `Bearer ${access_token}`)
        .send({ amount: 5000, paymentProvider: 'mercadopago' })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.status).toBe('pending');
    });
  });

  describe('GET /payments/status', () => {
    it('should return payment status', async () => {
      const { access_token } = await registerUser(app, 'user@test.com', 'password123');

      const res = await request(app.getHttpServer())
        .get('/payments/status')
        .set('Authorization', `Bearer ${access_token}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('POST /payments/webhook', () => {
    it('should accept webhook', async () => {
      const res = await request(app.getHttpServer())
        .post('/payments/webhook')
        .send({ type: 'payment', action: 'payment.created', data: {} })
        .expect(201);

      expect(res.body).toEqual({ received: true });
    });
  });
});
