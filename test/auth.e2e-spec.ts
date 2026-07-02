import { INestApplication } from '@nestjs/common';

const request = require('supertest');
import {
  createTestApp,
  registerUser,
  registerProfessional,
  loginUser,
} from './test-app.factory';
import { cleanDatabase } from './clean-database';

describe('Auth (e2e)', () => {
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

  describe('POST /auth/register', () => {
    it('should register a new user', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'test@test.com', password: 'password123' })
        .expect(201);

      expect(res.body).toHaveProperty('access_token');
      expect(res.body).toHaveProperty('userId');
    });

    it('should reject duplicate email', async () => {
      await registerUser(app, 'dup@test.com', 'password123');

      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'dup@test.com', password: 'password123' })
        .expect(409);
    });

    it('should reject short password', async () => {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ email: 'test@test.com', password: 'short' })
        .expect(400);
    });
  });

  describe('POST /auth/login', () => {
    it('should login with valid credentials', async () => {
      await registerProfessional(app, 'pro@test.com', 'password123');

      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'pro@test.com', password: 'password123' })
        .expect(201);

      expect(res.body).toHaveProperty('access_token');
    });

    it('should reject invalid password', async () => {
      await registerProfessional(app, 'pro@test.com', 'password123');

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'pro@test.com', password: 'wrongpassword' })
        .expect(401);
    });

    it('should reject login after user soft-delete', async () => {
      const { access_token, userId } = await registerProfessional(
        app,
        'deleted-login@test.com',
        'password123',
      );

      await request(app.getHttpServer())
        .delete(`/users/${userId}`)
        .set('Authorization', `Bearer ${access_token}`)
        .expect(200);

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email: 'deleted-login@test.com', password: 'password123' })
        .expect(401);
    });
  });

  describe('POST /auth/professional-register', () => {
    it('should register a professional with profile', async () => {
      // Get a valid rubroId
      const rubrosRes = await request(app.getHttpServer())
        .get('/profession-categories/rubros')
        .expect(200);

      const rubroId = rubrosRes.body.length > 0 ? rubrosRes.body[0].id : 1;

      const res = await request(app.getHttpServer())
        .post('/auth/professional-register')
        .send({
          email: 'pro@test.com',
          password: 'password123',
          name: 'Ana Garcia',
          city: 'Buenos Aires',
          rubroId,
        })
        .expect(201);

      expect(res.body).toHaveProperty('access_token');
      expect(res.body).toHaveProperty('userId');
    });
  });
});
