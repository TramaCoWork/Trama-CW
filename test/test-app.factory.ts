import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { seedTestCategories } from './test-seeds';

const request = require('supertest');

let testRubroId: number | null = null;

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

  const prismaService = app.get(PrismaService);
  testRubroId = await seedTestCategories(prismaService);

  return app;
}

export function getTestRubroId(): number {
  if (testRubroId === null) {
    throw new Error('Test rubro not seeded. Call createTestApp() first.');
  }

  return testRubroId;
}

export async function registerUser(
  app: INestApplication,
  email: string,
  password: string,
): Promise<{ access_token: string; userId: string }> {
  const prisma = app.get(PrismaService);

  const res = await request(app.getHttpServer())
    .post('/auth/register')
    .send({ email, password })
    .expect(201);

  await prisma.user.update({
    where: { id: res.body.userId },
    data: { emailVerified: true },
  });

  return res.body;
}

export async function registerProfessional(
  app: INestApplication,
  email: string,
  password: string,
  name: string = 'Test Professional',
): Promise<{ access_token: string; userId: string }> {
  const prisma = app.get(PrismaService);
  const rubroId = getTestRubroId();

  const res = await request(app.getHttpServer())
    .post('/auth/professional-register')
    .send({
      email,
      password,
      name,
      city: 'Buenos Aires',
      rubroId,
    })
    .expect(201);

  await prisma.user.update({
    where: { id: res.body.userId },
    data: { emailVerified: true },
  });

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
