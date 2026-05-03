import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const request = require('supertest');

export async function createTestApp(): Promise<INestApplication> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleFixture.createNestApplication();

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.init();
  return app;
}

export async function registerUser(
  app: INestApplication,
  email: string,
  password: string,
  role: 'client' | 'professional' | 'admin' = 'client',
): Promise<{ access_token: string; userId: string }> {
  const res = await request(app.getHttpServer())
    .post('/auth/register')
    .send({ email, password, role })
    .expect(201);

  return res.body;
}

export async function registerProfessional(
  app: INestApplication,
  email: string,
  password: string,
  name: string = 'Test Professional',
): Promise<{ access_token: string; userId: string }> {
  const res = await request(app.getHttpServer())
    .post('/auth/professional-register')
    .send({
      email,
      password,
      name,
      city: 'Buenos Aires',
      categories: [],
    })
    .expect(201);

  return res.body;
}

export async function loginUser(
  app: INestApplication,
  email: string,
  password: string,
): Promise<{ access_token: string; userId: string }> {
  const res = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ email, password })
    .expect(200);

  return res.body;
}
