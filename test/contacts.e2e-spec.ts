import { INestApplication } from '@nestjs/common';

const request = require('supertest');
import { createTestApp, registerProfessional } from './test-app.factory';
import { cleanDatabase } from './clean-database';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Contacts (e2e)', () => {
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

  describe('POST /contacts/log', () => {
    it('should log a contact', async () => {
      const { userId } = await registerProfessional(
        app,
        'pro@test.com',
        'password123',
      );
      const profile = await prisma.professionalProfile.findFirst({
        where: { userId },
      });

      const res = await request(app.getHttpServer())
        .post('/contacts/log')
        .send({ professionalId: profile!.id, contactType: 'whatsapp' })
        .expect(201);

      expect(res.body).toHaveProperty('id');
    });
  });
});
