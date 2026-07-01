import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../src/prisma/prisma.service';

export async function cleanDatabase(app: INestApplication): Promise<void> {
  const prisma = app.get(PrismaService);

  // Order matters: delete child tables first (FK constraints)
  // Sequential execution avoids Prisma 7.x transaction timeout on slow environments
  await prisma.$executeRaw`TRUNCATE TABLE "profile_validations" CASCADE`;
  await prisma.$executeRaw`TRUNCATE TABLE "documents" CASCADE`;
  await prisma.$executeRaw`TRUNCATE TABLE "certifications" CASCADE`;
  await prisma.$executeRaw`TRUNCATE TABLE "educations" CASCADE`;
  await prisma.$executeRaw`TRUNCATE TABLE "community_comments" CASCADE`;
  await prisma.$executeRaw`TRUNCATE TABLE "community_posts" CASCADE`;
  await prisma.$executeRaw`TRUNCATE TABLE "community_channel_comments" CASCADE`;
  await prisma.$executeRaw`TRUNCATE TABLE "community_channel_posts" CASCADE`;
  await prisma.$executeRaw`TRUNCATE TABLE "community_channel_members" CASCADE`;
  await prisma.$executeRaw`TRUNCATE TABLE "community_channels" CASCADE`;
  await prisma.$executeRaw`TRUNCATE TABLE "role_permissions" CASCADE`;
  await prisma.$executeRaw`TRUNCATE TABLE "permissions" CASCADE`;
  await prisma.$executeRaw`TRUNCATE TABLE "user_roles" CASCADE`;
  await prisma.$executeRaw`TRUNCATE TABLE "roles" CASCADE`;
  await prisma.$executeRaw`TRUNCATE TABLE "job_applications" CASCADE`;
  await prisma.$executeRaw`TRUNCATE TABLE "contact_logs" CASCADE`;
  await prisma.$executeRaw`TRUNCATE TABLE "payments" CASCADE`;
  await prisma.$executeRaw`TRUNCATE TABLE "professional_profiles" CASCADE`;
  await prisma.$executeRaw`TRUNCATE TABLE "jobs" CASCADE`;
  await prisma.$executeRaw`TRUNCATE TABLE "users" CASCADE`;
}
