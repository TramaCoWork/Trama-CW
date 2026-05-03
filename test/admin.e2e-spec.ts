import { INestApplication } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const request = require('supertest');
import { createTestApp, registerUser, registerProfessional } from './test-app.factory';
import { cleanDatabase } from './clean-database';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Admin (e2e)', () => {
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

  async function createAdminToken(): Promise<string> {
    const { access_token } = await registerUser(app, 'admin@test.com', 'password123', 'admin');
    return access_token;
  }

  async function createPendingProfile(): Promise<{ profileId: string; proToken: string }> {
    const { access_token, userId } = await registerProfessional(app, `pro${Date.now()}@test.com`, 'password123');
    const profile = await prisma.professionalProfile.findFirst({ where: { userId } });
    await prisma.professionalProfile.update({
      where: { id: profile!.id },
      data: { profileStatus: 'pending_review' },
    });
    return { profileId: profile!.id, proToken: access_token };
  }

  describe('GET /admin/professionals/pending', () => {
    it('should return pending professionals (admin)', async () => {
      const token = await createAdminToken();

      const res = await request(app.getHttpServer())
        .get('/admin/professionals/pending')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });

    it('should reject non-admin', async () => {
      const { access_token } = await registerProfessional(app, 'pro@test.com', 'password123');

      await request(app.getHttpServer())
        .get('/admin/professionals/pending')
        .set('Authorization', `Bearer ${access_token}`)
        .expect(403);
    });
  });

  describe('GET /admin/professionals/pending-review', () => {
    it('should return profiles pending review', async () => {
      const token = await createAdminToken();
      await createPendingProfile();

      const res = await request(app.getHttpServer())
        .get('/admin/professionals/pending-review')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('POST /admin/professionals/:id/approve', () => {
    it('should approve a profile', async () => {
      const token = await createAdminToken();
      const { profileId } = await createPendingProfile();

      await request(app.getHttpServer())
        .post(`/admin/professionals/${profileId}/approve`)
        .set('Authorization', `Bearer ${token}`)
        .expect(201);

      const profile = await prisma.professionalProfile.findUnique({ where: { id: profileId } });
      expect(profile!.isActive).toBe(true);
      expect(profile!.profileStatus).toBe('active');
    });
  });

  describe('POST /admin/professionals/:id/validate', () => {
    it('should approve with validation record', async () => {
      const token = await createAdminToken();
      const { profileId } = await createPendingProfile();

      const res = await request(app.getHttpServer())
        .post(`/admin/professionals/${profileId}/validate`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'manual_approved', reviewNotes: 'All good' })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.status).toBe('manual_approved');
    });

    it('should reject with notes', async () => {
      const token = await createAdminToken();
      const { profileId } = await createPendingProfile();

      const res = await request(app.getHttpServer())
        .post(`/admin/professionals/${profileId}/validate`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'manual_rejected', reviewNotes: 'Missing documents' })
        .expect(201);

      expect(res.body.status).toBe('manual_rejected');

      const profile = await prisma.professionalProfile.findUnique({ where: { id: profileId } });
      expect(profile!.profileStatus).toBe('rejected');
    });
  });

  describe('GET /admin/professionals/:id/documents', () => {
    it('should return documents for a profile', async () => {
      const token = await createAdminToken();
      const { profileId } = await createPendingProfile();

      const res = await request(app.getHttpServer())
        .get(`/admin/professionals/${profileId}/documents`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('GET /admin/professionals/:id/validation-history', () => {
    it('should return validation history', async () => {
      const token = await createAdminToken();
      const { profileId } = await createPendingProfile();

      const res = await request(app.getHttpServer())
        .get(`/admin/professionals/${profileId}/validation-history`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe('POST /admin/jobs', () => {
    it('should create a job', async () => {
      const token = await createAdminToken();

      const res = await request(app.getHttpServer())
        .post('/admin/jobs')
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'UX Designer', description: 'Looking for UX designer' })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.title).toBe('UX Designer');
    });
  });

  describe('GET /admin/payments', () => {
    it('should return payments list', async () => {
      const token = await createAdminToken();

      const res = await request(app.getHttpServer())
        .get('/admin/payments')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
    });
  });
});
