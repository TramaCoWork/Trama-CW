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
      expect(res.body.verificationStatus).toBe('pending');

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

  describe('POST /uploads/photo', () => {
    function createTestImage(): string {
      const tmpFile = path.join('/tmp', 'test-photo.png');
      // Minimal valid PNG (1x1 pixel)
      const pngHeader = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // PNG signature
        0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1
        0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
        0xde, 0x00, 0x00, 0x00, 0x0c, 0x49, 0x44, 0x41,
        0x54, 0x08, 0xd7, 0x63, 0xf8, 0xcf, 0xc0, 0x00,
        0x00, 0x00, 0x02, 0x00, 0x01, 0xe2, 0x21, 0xbc,
        0x33, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e,
        0x44, 0xae, 0x42, 0x60, 0x82,
      ]);
      fs.writeFileSync(tmpFile, pngHeader);
      return tmpFile;
    }

    it('should upload a photo', async () => {
      const { access_token } = await registerProfessional(app, 'pro@test.com', 'password123');
      const tmpFile = createTestImage();

      const res = await request(app.getHttpServer())
        .post('/uploads/photo')
        .set('Authorization', `Bearer ${access_token}`)
        .attach('file', tmpFile)
        .expect(201);

      expect(res.body).toHaveProperty('url');
      expect(res.body.url).toContain('/uploads/photos/');

      fs.unlinkSync(tmpFile);
    });

    it('should replace existing photo', async () => {
      const { access_token } = await registerProfessional(app, 'pro@test.com', 'password123');
      const tmpFile = createTestImage();

      const res1 = await request(app.getHttpServer())
        .post('/uploads/photo')
        .set('Authorization', `Bearer ${access_token}`)
        .attach('file', tmpFile)
        .expect(201);

      const res2 = await request(app.getHttpServer())
        .post('/uploads/photo')
        .set('Authorization', `Bearer ${access_token}`)
        .attach('file', tmpFile)
        .expect(201);

      expect(res2.body.url).not.toBe(res1.body.url);

      fs.unlinkSync(tmpFile);
    });

    it('should reject non-image files', async () => {
      const { access_token } = await registerProfessional(app, 'pro@test.com', 'password123');
      const tmpFile = path.join('/tmp', 'test.pdf');
      fs.writeFileSync(tmpFile, '%PDF-1.4 test content');

      await request(app.getHttpServer())
        .post('/uploads/photo')
        .set('Authorization', `Bearer ${access_token}`)
        .attach('file', tmpFile)
        .expect(400);

      fs.unlinkSync(tmpFile);
    });

    it('should reject without auth', async () => {
      await request(app.getHttpServer())
        .post('/uploads/photo')
        .expect(401);
    });

    it('should reject non-professional users', async () => {
      const { access_token } = await registerUser(app, 'client@test.com', 'password123', 'client');

      const tmpFile = createTestImage();

      await request(app.getHttpServer())
        .post('/uploads/photo')
        .set('Authorization', `Bearer ${access_token}`)
        .attach('file', tmpFile)
        .expect(403);

      fs.unlinkSync(tmpFile);
    });
  });

  describe('GET /uploads/photo/:profileId', () => {
    it('should serve photo publicly without auth', async () => {
      const { access_token, userId } = await registerProfessional(app, 'pro@test.com', 'password123');

      // Upload a photo first
      const tmpFile = path.join('/tmp', 'test-photo.png');
      const pngHeader = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
        0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
        0xde, 0x00, 0x00, 0x00, 0x0c, 0x49, 0x44, 0x41,
        0x54, 0x08, 0xd7, 0x63, 0xf8, 0xcf, 0xc0, 0x00,
        0x00, 0x00, 0x02, 0x00, 0x01, 0xe2, 0x21, 0xbc,
        0x33, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e,
        0x44, 0xae, 0x42, 0x60, 0x82,
      ]);
      fs.writeFileSync(tmpFile, pngHeader);

      await request(app.getHttpServer())
        .post('/uploads/photo')
        .set('Authorization', `Bearer ${access_token}`)
        .attach('file', tmpFile)
        .expect(201);

      // Get profileId from professionals endpoint
      const profileRes = await request(app.getHttpServer())
        .get(`/professionals/by-user/${userId}`)
        .set('Authorization', `Bearer ${access_token}`)
        .expect(200);

      const profileId = profileRes.body.id;

      // Access photo without auth (public)
      const photoRes = await request(app.getHttpServer())
        .get(`/uploads/photo/${profileId}`)
        .expect(200);

      expect(photoRes.headers['content-type']).toContain('image/png');

      fs.unlinkSync(tmpFile);
    });

    it('should return 404 for profile without photo', async () => {
      const { access_token, userId } = await registerProfessional(app, 'pro@test.com', 'password123');

      const profileRes = await request(app.getHttpServer())
        .get(`/professionals/by-user/${userId}`)
        .set('Authorization', `Bearer ${access_token}`)
        .expect(200);

      await request(app.getHttpServer())
        .get(`/uploads/photo/${profileRes.body.id}`)
        .expect(404);
    });
  });

  describe('DELETE /uploads/photo', () => {
    it('should delete own photo', async () => {
      const { access_token, userId } = await registerProfessional(app, 'pro@test.com', 'password123');

      const tmpFile = path.join('/tmp', 'test-photo.png');
      const pngHeader = Buffer.from([
        0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
        0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
        0xde, 0x00, 0x00, 0x00, 0x0c, 0x49, 0x44, 0x41,
        0x54, 0x08, 0xd7, 0x63, 0xf8, 0xcf, 0xc0, 0x00,
        0x00, 0x00, 0x02, 0x00, 0x01, 0xe2, 0x21, 0xbc,
        0x33, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e,
        0x44, 0xae, 0x42, 0x60, 0x82,
      ]);
      fs.writeFileSync(tmpFile, pngHeader);

      await request(app.getHttpServer())
        .post('/uploads/photo')
        .set('Authorization', `Bearer ${access_token}`)
        .attach('file', tmpFile)
        .expect(201);

      const delRes = await request(app.getHttpServer())
        .delete('/uploads/photo')
        .set('Authorization', `Bearer ${access_token}`)
        .expect(200);

      expect(delRes.body.deleted).toBe(true);

      // Verify photo is gone
      const profileRes = await request(app.getHttpServer())
        .get(`/professionals/by-user/${userId}`)
        .set('Authorization', `Bearer ${access_token}`)
        .expect(200);

      expect(profileRes.body.photo).toBeNull();

      fs.unlinkSync(tmpFile);
    });
  });
});
