import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../../src/prisma/prisma.service';
import { cleanDatabase } from '../clean-database';
import { createTestApp, registerUser } from '../test-app.factory';

const request = require('supertest');

describe('Admin Channels Members (e2e)', () => {
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

  it('grants membership, rejects duplicate with 409, revokes membership, and returns 404 when missing', async () => {
    const admin = await registerUser(
      app,
      'admin-members@test.com',
      'password123',
      'admin',
    );
    const professional = await registerUser(
      app,
      'professional-members@test.com',
      'password123',
      'professional',
    );

    const channel = await prisma.communityChannel.create({
      data: {
        name: 'Canal membresías',
        isActive: true,
      },
    });

    const addRes = await request(app.getHttpServer())
      .post(`/admin/channels/${channel.id}/members`)
      .set('Authorization', `Bearer ${admin.access_token}`)
      .send({ userId: professional.userId })
      .expect(201);

    expect(addRes.body.channelId).toBe(channel.id);
    expect(addRes.body.userId).toBe(professional.userId);
    expect(addRes.body.accepted).toBe(true);

    await request(app.getHttpServer())
      .post(`/admin/channels/${channel.id}/members`)
      .set('Authorization', `Bearer ${admin.access_token}`)
      .send({ userId: professional.userId })
      .expect(409);

    await request(app.getHttpServer())
      .delete(`/admin/channels/${channel.id}/members/${professional.userId}`)
      .set('Authorization', `Bearer ${admin.access_token}`)
      .expect(200)
      .expect({ message: 'Miembro eliminado' });

    await request(app.getHttpServer())
      .delete(`/admin/channels/${channel.id}/members/${professional.userId}`)
      .set('Authorization', `Bearer ${admin.access_token}`)
      .expect(404);
  });
});
