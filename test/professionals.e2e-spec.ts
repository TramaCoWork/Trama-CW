import { INestApplication } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const request = require('supertest');
import { createTestApp, registerProfessional, loginUser } from './test-app.factory';
import { cleanDatabase } from './clean-database';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Professionals (e2e)', () => {
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

  describe('GET /professionals', () => {
    it('should return empty list', async () => {
      const res = await request(app.getHttpServer())
        .get('/professionals')
        .expect(200);

      expect(res.body.data).toEqual([]);
      expect(res.body.total).toBe(0);
    });
  });

  describe('GET /professionals/featured', () => {
    it('should return featured professionals', async () => {
      const res = await request(app.getHttpServer())
        .get('/professionals/featured')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('POST /professionals', () => {
    it('should reject without auth', async () => {
      await request(app.getHttpServer())
        .post('/professionals')
        .send({ name: 'Test', services: [], city: 'BA', categories: [] })
        .expect(401);
    });
  });

  describe('GET /professionals/:id', () => {
    it('should return 404 for non-existent profile', async () => {
      await request(app.getHttpServer())
        .get('/professionals/00000000-0000-0000-0000-000000000000')
        .expect(404);
    });
  });

  describe('PATCH /professionals/:id/personal', () => {
    it('should update personal data', async () => {
      const { access_token, userId } = await registerProfessional(app, 'pro@test.com', 'password123');
      const profile = await prisma.professionalProfile.findFirst({ where: { userId } });

      const res = await request(app.getHttpServer())
        .patch(`/professionals/${profile!.id}/personal`)
        .set('Authorization', `Bearer ${access_token}`)
        .send({ dni: '12345678', city: 'Cordoba' })
        .expect(200);

      expect(res.body.dni).toBe('12345678');
      expect(res.body.city).toBe('Cordoba');
    });
  });

  describe('PATCH /professionals/:id/professional', () => {
    it('should update professional info', async () => {
      const { access_token, userId } = await registerProfessional(app, 'pro@test.com', 'password123');
      const profile = await prisma.professionalProfile.findFirst({ where: { userId } });

      const res = await request(app.getHttpServer())
        .patch(`/professionals/${profile!.id}/professional`)
        .set('Authorization', `Bearer ${access_token}`)
        .send({ mainProfession: 'UX Designer', bio: 'Experienced designer' })
        .expect(200);

      expect(res.body.mainProfession).toBe('UX Designer');
    });
  });

  describe('Education CRUD', () => {
    it('should add and list education', async () => {
      const { access_token, userId } = await registerProfessional(app, 'pro@test.com', 'password123');
      const profile = await prisma.professionalProfile.findFirst({ where: { userId } });

      const createRes = await request(app.getHttpServer())
        .post(`/professionals/${profile!.id}/education`)
        .set('Authorization', `Bearer ${access_token}`)
        .send({ level: 'universitario', title: 'Lic. Diseno', institution: 'UBA', year: 2020 })
        .expect(201);

      expect(createRes.body).toHaveProperty('id');

      const listRes = await request(app.getHttpServer())
        .get(`/professionals/${profile!.id}/education`)
        .set('Authorization', `Bearer ${access_token}`)
        .expect(200);

      expect(listRes.body).toHaveLength(1);
    });

    it('should delete education', async () => {
      const { access_token, userId } = await registerProfessional(app, 'pro@test.com', 'password123');
      const profile = await prisma.professionalProfile.findFirst({ where: { userId } });

      const createRes = await request(app.getHttpServer())
        .post(`/professionals/${profile!.id}/education`)
        .set('Authorization', `Bearer ${access_token}`)
        .send({ level: 'universitario', title: 'Lic. Diseno', institution: 'UBA' })
        .expect(201);

      await request(app.getHttpServer())
        .delete(`/professionals/${profile!.id}/education/${createRes.body.id}`)
        .set('Authorization', `Bearer ${access_token}`)
        .expect(200);
    });
  });

  describe('Certifications CRUD', () => {
    it('should add certification', async () => {
      const { access_token, userId } = await registerProfessional(app, 'pro@test.com', 'password123');
      const profile = await prisma.professionalProfile.findFirst({ where: { userId } });

      const res = await request(app.getHttpServer())
        .post(`/professionals/${profile!.id}/certifications`)
        .set('Authorization', `Bearer ${access_token}`)
        .send({ name: 'Google UX', institution: 'Google', year: 2023 })
        .expect(201);

      expect(res.body).toHaveProperty('id');
    });
  });

  describe('PATCH /professionals/:id/preferences', () => {
    it('should update preferences', async () => {
      const { access_token, userId } = await registerProfessional(app, 'pro@test.com', 'password123');
      const profile = await prisma.professionalProfile.findFirst({ where: { userId } });

      const res = await request(app.getHttpServer())
        .patch(`/professionals/${profile!.id}/preferences`)
        .set('Authorization', `Bearer ${access_token}`)
        .send({ interestsInTrama: ['networking'], usageFrequency: 'daily' })
        .expect(200);

      expect(res.body.usageFrequency).toBe('daily');
    });
  });

  describe('PATCH /professionals/:id/motivation', () => {
    it('should update motivation', async () => {
      const { access_token, userId } = await registerProfessional(app, 'pro@test.com', 'password123');
      const profile = await prisma.professionalProfile.findFirst({ where: { userId } });

      const res = await request(app.getHttpServer())
        .patch(`/professionals/${profile!.id}/motivation`)
        .set('Authorization', `Bearer ${access_token}`)
        .send({ tramaMotivation: 'Quiero crecer profesionalmente' })
        .expect(200);

      expect(res.body.tramaMotivation).toBe('Quiero crecer profesionalmente');
    });
  });

  describe('POST /professionals/:id/submit', () => {
    it('should reject if missing required fields', async () => {
      const { access_token, userId } = await registerProfessional(app, 'pro@test.com', 'password123');
      const profile = await prisma.professionalProfile.findFirst({ where: { userId } });

      await request(app.getHttpServer())
        .post(`/professionals/${profile!.id}/submit`)
        .set('Authorization', `Bearer ${access_token}`)
        .expect(400);
    });
  });
});
