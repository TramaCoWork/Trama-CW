import { INestApplication } from '@nestjs/common';

const request = require('supertest');
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { PrismaService } from '../src/prisma/prisma.service';
import { cleanDatabase } from './clean-database';
import { createTestApp } from './test-app.factory';

describe('Professional address (e2e)', () => {
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

  async function getRubroId(): Promise<number> {
    const rubrosRes = await request(app.getHttpServer())
      .get('/profession-categories/rubros')
      .expect(200);

    return rubrosRes.body.length > 0 ? rubrosRes.body[0].id : 1;
  }

  async function uploadCv(accessToken: string): Promise<void> {
    const filePath = path.join(
      os.tmpdir(),
      `professional-address-${Date.now()}.pdf`,
    );
    fs.writeFileSync(filePath, '%PDF-1.4 professional-address test');

    await request(app.getHttpServer())
      .post('/uploads/document')
      .set('Authorization', `Bearer ${accessToken}`)
      .field('type', 'cv')
      .attach('file', filePath)
      .expect(201);

    fs.unlinkSync(filePath);
  }

  it('POST with address returns 201 and persists address', async () => {
    const rubroId = await getRubroId();

    const registerRes = await request(app.getHttpServer())
      .post('/auth/professional-register')
      .send({
        email: 'pro-address@test.com',
        password: 'password123',
        name: 'Pro Address',
        city: 'Buenos Aires',
        address: 'Av. Siempre Viva 742',
        rubroId,
      })
      .expect(201);

    const profileRes = await request(app.getHttpServer())
      .get(`/professionals/by-user/${registerRes.body.userId}`)
      .set('Authorization', `Bearer ${registerRes.body.access_token}`)
      .expect(200);

    expect(profileRes.body.address).toBe('Av. Siempre Viva 742');
  });

  it('POST without address returns 201', async () => {
    const rubroId = await getRubroId();

    const registerRes = await request(app.getHttpServer())
      .post('/auth/professional-register')
      .send({
        email: 'pro-no-address@test.com',
        password: 'password123',
        name: 'Pro No Address',
        city: 'Córdoba',
        rubroId,
      })
      .expect(201);

    const profile = await prisma.professionalProfile.findUniqueOrThrow({
      where: { userId: registerRes.body.userId },
    });

    expect(profile.address).toBeNull();
  });

  it('PATCH with address updates field', async () => {
    const rubroId = await getRubroId();

    const registerRes = await request(app.getHttpServer())
      .post('/auth/professional-register')
      .send({
        email: 'pro-update-address@test.com',
        password: 'password123',
        name: 'Pro Update Address',
        city: 'Rosario',
        rubroId,
      })
      .expect(201);

    const profile = await prisma.professionalProfile.findUniqueOrThrow({
      where: { userId: registerRes.body.userId },
    });

    const updateRes = await request(app.getHttpServer())
      .patch(`/professionals/${profile.id}/personal`)
      .set('Authorization', `Bearer ${registerRes.body.access_token}`)
      .send({ address: 'Calle Falsa 123' })
      .expect(200);

    expect(updateRes.body.address).toBe('Calle Falsa 123');
  });

  it('GET returns address in response (nullable)', async () => {
    const rubroId = await getRubroId();

    const registerRes = await request(app.getHttpServer())
      .post('/auth/professional-register')
      .send({
        email: 'pro-get-address@test.com',
        password: 'password123',
        name: 'Pro Get Address',
        city: 'Mendoza',
        address: 'San Martín 456',
        rubroId,
      })
      .expect(201);

    const profile = await prisma.professionalProfile.findUniqueOrThrow({
      where: { userId: registerRes.body.userId },
    });

    await prisma.user.update({
      where: { id: registerRes.body.userId },
      data: { emailVerified: true },
    });

    await prisma.professionalProfile.update({
      where: { id: profile.id },
      data: { isActive: true, profileStatus: 'active' },
    });

    const getRes = await request(app.getHttpServer())
      .get(`/professionals/${profile.id}`)
      .expect(200);

    expect(getRes.body).toHaveProperty('address');
    expect(getRes.body.address).toBe('San Martín 456');
  });

  it('POST submit for review works without address', async () => {
    const rubroId = await getRubroId();

    const registerRes = await request(app.getHttpServer())
      .post('/auth/professional-register')
      .send({
        email: 'pro-submit-no-address@test.com',
        password: 'password123',
        name: 'Pro Submit No Address',
        city: 'La Plata',
        rubroId,
      })
      .expect(201);

    const profile = await prisma.professionalProfile.findUniqueOrThrow({
      where: { userId: registerRes.body.userId },
    });

    await request(app.getHttpServer())
      .patch(`/professionals/${profile.id}/personal`)
      .set('Authorization', `Bearer ${registerRes.body.access_token}`)
      .send({ dni: '30123456' })
      .expect(200);

    await uploadCv(registerRes.body.access_token);

    const submitRes = await request(app.getHttpServer())
      .post(`/professionals/${profile.id}/submit`)
      .set('Authorization', `Bearer ${registerRes.body.access_token}`)
      .expect(201);

    expect(submitRes.body.profileStatus).toBe('pending_review');
  });
});
