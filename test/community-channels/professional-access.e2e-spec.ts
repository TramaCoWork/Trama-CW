import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../../src/prisma/prisma.service';
import { cleanDatabase } from '../clean-database';
import { createTestApp, registerUser } from '../test-app.factory';

const request = require('supertest');

describe('Professional Channels Access (e2e)', () => {
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

  it('GET /channels returns only active accepted memberships and blocks non-members with 403', async () => {
    const professional = await registerUser(
      app,
      'professional-access@test.com',
      'password123',
      'professional',
    );
    const outsider = await registerUser(
      app,
      'professional-outsider@test.com',
      'password123',
      'professional',
    );

    const activeChannel = await prisma.communityChannel.create({
      data: { name: 'Canal activo', isActive: true },
    });
    const inactiveChannel = await prisma.communityChannel.create({
      data: { name: 'Canal inactivo', isActive: false },
    });

    await prisma.communityChannelMember.createMany({
      data: [
        {
          channelId: activeChannel.id,
          userId: professional.userId,
          accepted: true,
        },
        {
          channelId: inactiveChannel.id,
          userId: professional.userId,
          accepted: true,
        },
      ],
    });

    await prisma.communityChannelPost.create({
      data: {
        channelId: activeChannel.id,
        userId: professional.userId,
        content: 'Post activo',
      },
    });

    const listRes = await request(app.getHttpServer())
      .get('/channels')
      .set('Authorization', `Bearer ${professional.access_token}`)
      .expect(200);

    expect(listRes.body).toHaveLength(1);
    expect(listRes.body[0].id).toBe(activeChannel.id);

    await request(app.getHttpServer())
      .get(`/channels/${activeChannel.id}/posts`)
      .set('Authorization', `Bearer ${outsider.access_token}`)
      .expect(403);
  });
});
