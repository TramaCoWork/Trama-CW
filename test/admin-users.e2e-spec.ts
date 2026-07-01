import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const request = require('supertest');
import { createTestApp } from './test-app.factory';
import { cleanDatabase } from './clean-database';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Admin users CRUD (e2e)', () => {
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

  async function createAdminToken(): Promise<{ token: string; userId: string }> {
    const adminRole = await prisma.role.findUniqueOrThrow({ where: { name: 'admin' } });

    const admin = await prisma.user.create({
      data: {
        email: `admin-${Date.now()}-${Math.floor(Math.random() * 10000)}@test.com`,
        passwordHash: 'test-password-hash',
        emailVerified: true,
        userRoles: { create: [{ roleId: adminRole.id }] },
      },
    });

    const jwtService = app.get(JwtService);
    const token = jwtService.sign({
      sub: admin.id,
      email: admin.email,
      roles: [{ name: 'admin', type: 'admin' }],
      permissions: [],
    });

    return { token, userId: admin.id };
  }

  async function createUser(
    overrides: Partial<{ email: string; roles: string[]; deletedAt: Date }> = {},
  ) {
    const timestamp = `${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const roleNames = overrides.roles?.length ? overrides.roles : ['client'];
    const roles = await prisma.role.findMany({ where: { name: { in: roleNames } } });

    return prisma.user.create({
      data: {
        email: overrides.email ?? `user-${timestamp}@test.com`,
        passwordHash: 'test-password-hash',
        emailVerified: true,
        deletedAt: overrides.deletedAt,
        userRoles: { create: roles.map((role) => ({ roleId: role.id })) },
      },
      include: { userRoles: { include: { role: true } } },
    });
  }

  describe('POST /admin/users', () => {
    it('creates a user and excludes passwordHash in response', async () => {
      const { token } = await createAdminToken();

      const res = await request(app.getHttpServer())
        .post('/admin/users')
        .set('Authorization', `Bearer ${token}`)
        .send({
          email: 'created-user@test.com',
          password: 'password123',
          roles: ['professional'],
        })
        .expect(201);

      expect(res.body.message).toBe('User created successfully');
      expect(res.body.user.emailVerified).toBe(true);
      expect(res.body.user.email).toBe('created-user@test.com');
      expect(res.body.user.userRoles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            role: expect.objectContaining({ name: 'professional' }),
          }),
        ]),
      );
      expect(res.body.user).not.toHaveProperty('passwordHash');
    });

    it('rejects invalid payloads and duplicate emails', async () => {
      const { token } = await createAdminToken();

      await request(app.getHttpServer())
        .post('/admin/users')
        .set('Authorization', `Bearer ${token}`)
        .send({ password: 'password123' })
        .expect(400);

      await request(app.getHttpServer())
        .post('/admin/users')
        .set('Authorization', `Bearer ${token}`)
        .send({
          email: 'invalid-role@test.com',
          password: 'password123',
          roles: ['owner'],
        })
        .expect(400);

      await request(app.getHttpServer())
        .post('/admin/users')
        .set('Authorization', `Bearer ${token}`)
        .send({ email: 'short-pass@test.com', password: 'short' })
        .expect(400);

      await createUser({ email: 'duplicate@test.com' });

      const duplicate = await request(app.getHttpServer())
        .post('/admin/users')
        .set('Authorization', `Bearer ${token}`)
        .send({ email: 'duplicate@test.com', password: 'password123' })
        .expect(409);

      expect(duplicate.body.message).toBe('Email already in use');
    });
  });

  describe('GET /admin/users', () => {
    it('lists only active users', async () => {
      const { token } = await createAdminToken();
      const active = await createUser({ email: 'active-user@test.com' });
      await createUser({
        email: 'deleted-user@test.com',
        deletedAt: new Date(),
      });

      const res = await request(app.getHttpServer())
        .get('/admin/users')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.some((user: { id: string }) => user.id === active.id)).toBe(true);
      expect(res.body.some((user: { email: string }) => user.email === 'deleted-user@test.com')).toBe(false);
      expect(res.body.every((user: { deletedAt: string | null }) => user.deletedAt === null)).toBe(true);
    });
  });

  describe('GET /admin/users/:id', () => {
    it('returns an active user by uuid without passwordHash', async () => {
      const { token } = await createAdminToken();
      const user = await createUser({ email: 'view-user@test.com' });

      const res = await request(app.getHttpServer())
        .get(`/admin/users/${user.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.id).toBe(user.id);
      expect(res.body.email).toBe('view-user@test.com');
      expect(res.body).not.toHaveProperty('passwordHash');
    });

    it('returns 404 for missing or soft-deleted user', async () => {
      const { token } = await createAdminToken();
      const deleted = await createUser({
        email: 'to-delete@test.com',
        deletedAt: new Date(),
      });

      await request(app.getHttpServer())
        .get('/admin/users/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${token}`)
        .expect(404);

      await request(app.getHttpServer())
        .get(`/admin/users/${deleted.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(404);
    });
  });

  describe('PATCH /admin/users/:id', () => {
    it('updates email/password/role, re-hashes password, and supports empty-body no-op', async () => {
      const { token } = await createAdminToken();
      const user = await createUser({
        email: 'before-update@test.com',
        roles: ['client'],
      });

      const updated = await request(app.getHttpServer())
        .patch(`/admin/users/${user.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({
          email: 'after-update@test.com',
          password: 'new-password-123',
          roles: ['admin'],
        })
        .expect(200);

      expect(updated.body.email).toBe('after-update@test.com');
      expect(updated.body.userRoles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            role: expect.objectContaining({ name: 'admin' }),
          }),
        ]),
      );
      expect(updated.body).not.toHaveProperty('passwordHash');

      const persisted = await prisma.user.findUnique({ where: { id: user.id } });
      expect(persisted).not.toBeNull();
      expect(persisted!.passwordHash).not.toBe('test-password-hash');
      expect(await bcrypt.compare('new-password-123', persisted!.passwordHash)).toBe(true);

      const noop = await request(app.getHttpServer())
        .patch(`/admin/users/${user.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({})
        .expect(200);

      expect(noop.body.id).toBe(user.id);
      expect(noop.body.email).toBe('after-update@test.com');
      expect(noop.body.userRoles).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            role: expect.objectContaining({ name: 'admin' }),
          }),
        ]),
      );
    });

    it('returns 409 on email conflict and 403 on self-mutation', async () => {
      const { token, userId: adminId } = await createAdminToken();
      const target = await createUser({ email: 'target-user@test.com' });
      await createUser({ email: 'already-in-use@test.com' });

      await request(app.getHttpServer())
        .patch(`/admin/users/${target.id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ email: 'already-in-use@test.com' })
        .expect(409);

      const before = await prisma.user.findUnique({ where: { id: adminId } });

      await request(app.getHttpServer())
        .patch(`/admin/users/${adminId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ email: 'self-edit@test.com' })
        .expect(403);

      const after = await prisma.user.findUnique({ where: { id: adminId } });
      expect(after?.email).toBe(before?.email);
    });
  });

  describe('DELETE /admin/users/:id', () => {
    it('soft-deletes target user and blocks self-delete', async () => {
      const { token, userId: adminId } = await createAdminToken();
      const target = await createUser({ email: 'delete-target@test.com' });

      const deleted = await request(app.getHttpServer())
        .delete(`/admin/users/${target.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(deleted.body.message).toBe('User deleted successfully');

      const persisted = await prisma.user.findUnique({ where: { id: target.id } });
      expect(persisted?.deletedAt).not.toBeNull();

      const before = await prisma.user.findUnique({ where: { id: adminId } });

      await request(app.getHttpServer())
        .delete(`/admin/users/${adminId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      const after = await prisma.user.findUnique({ where: { id: adminId } });
      expect(after?.deletedAt).toBe(before?.deletedAt ?? null);
    });
  });
});
