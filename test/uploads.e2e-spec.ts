import { INestApplication } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const request = require('supertest');
import { createTestApp, registerProfessional, registerUser } from './test-app.factory';
import { cleanDatabase } from './clean-database';
import * as path from 'path';
import * as fs from 'fs';

describe('Uploads (e2e)', () => {
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

  async function uploadTestDocument(token: string): Promise<string> {
    const tmpFile = path.join('/tmp', 'test.pdf');
    fs.writeFileSync(tmpFile, '%PDF-1.4 test content');

    const res = await request(app.getHttpServer())
      .post('/uploads/document')
      .set('Authorization', `Bearer ${token}`)
      .field('type', 'cv')
      .attach('file', tmpFile)
      .expect(201);

    fs.unlinkSync(tmpFile);
    return res.body.id;
  }

  describe('POST /uploads/document', () => {
    it('should upload a document', async () => {
      const { access_token } = await registerProfessional(app, 'pro@test.com', 'password123');

      const tmpFile = path.join('/tmp', 'test.pdf');
      fs.writeFileSync(tmpFile, '%PDF-1.4 test content');

      const res = await request(app.getHttpServer())
        .post('/uploads/document')
        .set('Authorization', `Bearer ${access_token}`)
        .field('type', 'cv')
        .attach('file', tmpFile)
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.type).toBe('cv');

      fs.unlinkSync(tmpFile);
    });

    it('should reject without auth', async () => {
      await request(app.getHttpServer())
        .post('/uploads/document')
        .field('type', 'cv')
        .expect(401);
    });
  });

  describe('GET /uploads/document/:id', () => {
    it('should reject without auth', async () => {
      await request(app.getHttpServer())
        .get('/uploads/document/00000000-0000-0000-0000-000000000000')
        .expect(401);
    });

    it('should return 404 for non-existent document', async () => {
      const { access_token } = await registerProfessional(app, 'pro@test.com', 'password123');

      await request(app.getHttpServer())
        .get('/uploads/document/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${access_token}`)
        .expect(404);
    });

    it('should allow owner to access their document', async () => {
      const { access_token } = await registerProfessional(app, 'pro@test.com', 'password123');
      const docId = await uploadTestDocument(access_token);

      await request(app.getHttpServer())
        .get(`/uploads/document/${docId}`)
        .set('Authorization', `Bearer ${access_token}`)
        .expect(200);
    });

    it('should allow admin to access any document', async () => {
      const { access_token: proToken } = await registerProfessional(app, 'pro@test.com', 'password123');
      const docId = await uploadTestDocument(proToken);

      const { access_token: adminToken } = await registerUser(app, 'admin@test.com', 'password123', 'admin');

      await request(app.getHttpServer())
        .get(`/uploads/document/${docId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);
    });

    it('should reject access from another user', async () => {
      const { access_token: proToken } = await registerProfessional(app, 'pro@test.com', 'password123');
      const docId = await uploadTestDocument(proToken);

      const { access_token: otherToken } = await registerProfessional(app, 'other@test.com', 'password123');

      await request(app.getHttpServer())
        .get(`/uploads/document/${docId}`)
        .set('Authorization', `Bearer ${otherToken}`)
        .expect(403);
    });
  });
});
