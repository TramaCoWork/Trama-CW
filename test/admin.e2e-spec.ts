import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const request = require('supertest');
import { createTestApp, registerProfessional } from './test-app.factory';
import { cleanDatabase } from './clean-database';
import { PrismaService } from '../src/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

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
    const admin = await prisma.user.create({
      data: {
        email: `admin-${Date.now()}-${Math.floor(Math.random() * 10000)}@test.com`,
        passwordHash: 'test-password-hash',
        role: UserRole.admin,
        emailVerified: true,
      },
    });
    const jwtService = app.get(JwtService);

    return jwtService.sign({
      sub: admin.id,
      email: admin.email,
      role: admin.role,
    });
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

  async function createProfessionalToken(): Promise<string> {
    const professional = await prisma.user.create({
      data: {
        email: `professional-${Date.now()}-${Math.floor(Math.random() * 10000)}@test.com`,
        passwordHash: 'test-password-hash',
        role: UserRole.professional,
        emailVerified: true,
      },
    });
    const jwtService = app.get(JwtService);

    return jwtService.sign({
      sub: professional.id,
      email: professional.email,
      role: professional.role,
    });
  }

  async function getFirstRubroId(): Promise<number> {
    const rubrosRes = await request(app.getHttpServer())
      .get('/profession-categories/rubros')
      .expect(200);

    return rubrosRes.body.length > 0 ? rubrosRes.body[0].id : 1;
  }

  async function adminRegisterProfessional(
    token: string,
    overrides: Record<string, unknown> = {},
  ) {
    const rubroId = await getFirstRubroId();
    const email = `admin-pro-${Date.now()}-${Math.floor(Math.random() * 10000)}@test.com`;

    return request(app.getHttpServer())
      .post('/admin/professionals/register')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Admin Professional',
        email,
        password: 'password123',
        rubroId,
        ...overrides,
      });
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

  describe('POST /admin/professionals/register — isActive', () => {
    it('should create active profile when is_active is true', async () => {
      const token = await createAdminToken();

      const res = await adminRegisterProfessional(token, { is_active: true });

      expect(res.status).toBe(201);

      expect(res.body.user.profile.isActive).toBe(true);
    });

    it('should create inactive profile when is_active is omitted', async () => {
      const token = await createAdminToken();

      const res = await adminRegisterProfessional(token);

      expect(res.status).toBe(201);

      expect(res.body.user.profile.isActive).toBe(false);
    });

    it('should create inactive profile when is_active is false', async () => {
      const token = await createAdminToken();

      const res = await adminRegisterProfessional(token, { is_active: false });

      expect(res.status).toBe(201);

      expect(res.body.user.profile.isActive).toBe(false);
    });
  });

  describe('PATCH /admin/professionals/:id', () => {
    it('should toggle isActive to false with is_active payload', async () => {
      const token = await createAdminToken();
      const created = await adminRegisterProfessional(token, { is_active: true });
      expect(created.status).toBe(201);
      const profileId = created.body.user.profile.id;

      const updated = await request(app.getHttpServer())
        .patch(`/admin/professionals/${profileId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ is_active: false })
        .expect(200);

      expect(updated.body.isActive).toBe(false);
    });

    it('should keep isActive unchanged when omitted', async () => {
      const token = await createAdminToken();
      const created = await adminRegisterProfessional(token, { is_active: true });
      expect(created.status).toBe(201);
      const profileId = created.body.user.profile.id;

      const updated = await request(app.getHttpServer())
        .patch(`/admin/professionals/${profileId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ city: 'Rosario' })
        .expect(200);

      expect(updated.body.isActive).toBe(true);
      expect(updated.body.city).toBe('Rosario');
    });

    it('should return 404 for non-existent profile', async () => {
      const token = await createAdminToken();

      await request(app.getHttpServer())
        .patch('/admin/professionals/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${token}`)
        .send({ is_active: false })
        .expect(404);
    });

    it('should reject non-admin', async () => {
      const token = await createAdminToken();
      const created = await adminRegisterProfessional(token, { is_active: true });
      expect(created.status).toBe(201);
      const profileId = created.body.user.profile.id;
      const { access_token: proToken } = await registerProfessional(
        app,
        `pro-admin-patch-${Date.now()}@test.com`,
        'password123',
      );

      await request(app.getHttpServer())
        .patch(`/admin/professionals/${profileId}`)
        .set('Authorization', `Bearer ${proToken}`)
        .send({ is_active: false })
        .expect(403);
    });

    it('should return isActive in GET professional response', async () => {
      const token = await createAdminToken();
      const created = await adminRegisterProfessional(token, { is_active: true });
      expect(created.status).toBe(201);
      const profileId = created.body.user.profile.id;

      const res = await request(app.getHttpServer())
        .get(`/admin/professionals/${profileId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body).toHaveProperty('isActive');
      expect(res.body.isActive).toBe(true);
    });
  });

  describe('PATCH /admin/professionals/:id/password', () => {
    it('should reject requests without JWT', async () => {
      const { profileId } = await createPendingProfile();

      await request(app.getHttpServer())
        .patch(`/admin/professionals/${profileId}/password`)
        .send({ password: 'newPassword123', confirmPassword: 'newPassword123' })
        .expect(401);
    });

    it('should reject non-admin users', async () => {
      const { profileId, proToken } = await createPendingProfile();

      await request(app.getHttpServer())
        .patch(`/admin/professionals/${profileId}/password`)
        .set('Authorization', `Bearer ${proToken}`)
        .send({ password: 'newPassword123', confirmPassword: 'newPassword123' })
        .expect(403);
    });

    it('should update professional password hash with bcrypt rounds 10', async () => {
      const adminToken = await createAdminToken();
      const { profileId } = await createPendingProfile();

      const profileBefore = await prisma.professionalProfile.findUnique({
        where: { id: profileId },
        include: { user: true },
      });

      const response = await request(app.getHttpServer())
        .patch(`/admin/professionals/${profileId}/password`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ password: 'newPassword123', confirmPassword: 'newPassword123' })
        .expect(200);

      expect(response.body).toEqual({ message: 'Password updated' });

      const profileAfter = await prisma.professionalProfile.findUnique({
        where: { id: profileId },
        include: { user: true },
      });

      expect(profileBefore).not.toBeNull();
      expect(profileAfter).not.toBeNull();
      expect(profileBefore!.user.passwordHash).not.toBe(profileAfter!.user.passwordHash);
      await expect(bcrypt.compare('newPassword123', profileAfter!.user.passwordHash)).resolves.toBe(true);
    });

    it('should return 400 when confirmPassword does not match', async () => {
      const adminToken = await createAdminToken();
      const { profileId } = await createPendingProfile();

      const response = await request(app.getHttpServer())
        .patch(`/admin/professionals/${profileId}/password`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ password: 'newPassword123', confirmPassword: 'differentPassword123' })
        .expect(400);

      expect(JSON.stringify(response.body)).toContain('confirmPassword');
    });

    it('should return 404 for unknown professional profile', async () => {
      const adminToken = await createAdminToken();

      await request(app.getHttpServer())
        .patch('/admin/professionals/00000000-0000-0000-0000-000000000000/password')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ password: 'newPassword123', confirmPassword: 'newPassword123' })
        .expect(404);
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

  describe('POST /admin/documents/:id/verify', () => {
    async function uploadDocumentForProfile(proToken: string): Promise<string> {
      const tmpFile = path.join(os.tmpdir(), 'test-doc.pdf');
      fs.writeFileSync(tmpFile, '%PDF-1.4 test content');

      const res = await request(app.getHttpServer())
        .post('/uploads/document')
        .set('Authorization', `Bearer ${proToken}`)
        .field('type', 'cv')
        .attach('file', tmpFile)
        .expect(201);

      fs.unlinkSync(tmpFile);
      return res.body.id;
    }

    it('should approve a document', async () => {
      const token = await createAdminToken();
      const { proToken } = await createPendingProfile();
      const docId = await uploadDocumentForProfile(proToken);

      const res = await request(app.getHttpServer())
        .post(`/admin/documents/${docId}/verify`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'approved', verificationNotes: 'CV verificado correctamente' })
        .expect(201);

      expect(res.body.verificationStatus).toBe('approved');
      expect(res.body.verificationType).toBe('manual');
      expect(res.body.verificationNotes).toBe('CV verificado correctamente');
      expect(res.body.verifiedBy).toBeDefined();
      expect(res.body.verifiedAt).toBeDefined();
    });

    it('should reject a document with notes', async () => {
      const token = await createAdminToken();
      const { proToken } = await createPendingProfile();
      const docId = await uploadDocumentForProfile(proToken);

      const res = await request(app.getHttpServer())
        .post(`/admin/documents/${docId}/verify`)
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'rejected', verificationNotes: 'Documento ilegible' })
        .expect(201);

      expect(res.body.verificationStatus).toBe('rejected');
      expect(res.body.verificationNotes).toBe('Documento ilegible');
    });

    it('should return 404 for non-existent document', async () => {
      const token = await createAdminToken();

      await request(app.getHttpServer())
        .post('/admin/documents/00000000-0000-0000-0000-000000000000/verify')
        .set('Authorization', `Bearer ${token}`)
        .send({ status: 'approved' })
        .expect(404);
    });

    it('should reject non-admin', async () => {
      const proToken = await createProfessionalToken();

      await request(app.getHttpServer())
        .post('/admin/documents/00000000-0000-0000-0000-000000000000/verify')
        .set('Authorization', `Bearer ${proToken}`)
        .send({ status: 'approved' })
        .expect(403);
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
