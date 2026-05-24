import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const request = require('supertest');
import { createTestApp, registerProfessional } from './test-app.factory';
import { cleanDatabase } from './clean-database';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Users soft-delete (e2e)', () => {
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
        email: `admin-${Date.now()}@test.com`,
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

  it('POST /users/:id soft-deletes user and blocks login', async () => {
    const { access_token, userId } = await registerProfessional(app, 'soft-delete@test.com', 'password123');

    await request(app.getHttpServer())
      .delete(`/users/${userId}`)
      .set('Authorization', `Bearer ${access_token}`)
      .expect(200);

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'soft-delete@test.com', password: 'password123' })
      .expect(401);
  });

  it('rejects protected endpoint with valid JWT after soft-delete', async () => {
    const { access_token, userId } = await registerProfessional(app, 'jwt-soft-delete@test.com', 'password123');

    await request(app.getHttpServer())
      .delete(`/users/${userId}`)
      .set('Authorization', `Bearer ${access_token}`)
      .expect(200);

    await request(app.getHttpServer())
      .get('/dashboard/me')
      .set('Authorization', `Bearer ${access_token}`)
      .expect(401);
  });

  it('admin can list deleted users and restore them', async () => {
    const adminToken = await createAdminToken();
    const { access_token, userId } = await registerProfessional(app, 'restore@test.com', 'password123');

    await request(app.getHttpServer())
      .delete(`/users/${userId}`)
      .set('Authorization', `Bearer ${access_token}`)
      .expect(200);

    const deletedUsers = await request(app.getHttpServer())
      .get('/admin/users/deleted')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(deletedUsers.body.some((u: { id: string }) => u.id === userId)).toBe(true);

    await request(app.getHttpServer())
      .post(`/admin/users/${userId}/restore`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(201);

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'restore@test.com', password: 'password123' })
      .expect(201);
  });

  it('excludes soft-deleted profile from public search', async () => {
    const { access_token, userId } = await registerProfessional(app, 'search-delete@test.com', 'password123', 'Soft Delete Pro');

    const profile = await prisma.professionalProfile.findFirst({ where: { userId } });
    await prisma.user.update({ where: { id: userId }, data: { emailVerified: true } });
    await prisma.professionalProfile.update({
      where: { id: profile!.id },
      data: { isActive: true, profileStatus: 'active' },
    });

    const beforeDelete = await request(app.getHttpServer())
      .get('/search')
      .query({ city: 'Buenos Aires' })
      .expect(200);

    expect(beforeDelete.body.some((p: { id: string }) => p.id === profile!.id)).toBe(true);

    await request(app.getHttpServer())
      .delete(`/users/${userId}`)
      .set('Authorization', `Bearer ${access_token}`)
      .expect(200);

    const afterDelete = await request(app.getHttpServer())
      .get('/search')
      .query({ city: 'Buenos Aires' })
      .expect(200);

    expect(afterDelete.body.some((p: { id: string }) => p.id === profile!.id)).toBe(false);
  });
});
