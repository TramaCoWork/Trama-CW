import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../src/prisma/prisma.service';

export async function cleanDatabase(app: INestApplication): Promise<void> {
  const prisma = app.get(PrismaService);

  // Order matters: delete child tables first (FK constraints)
  await prisma.$transaction([
    prisma.$executeRaw`TRUNCATE TABLE "profile_validations" CASCADE`,
    prisma.$executeRaw`TRUNCATE TABLE "documents" CASCADE`,
    prisma.$executeRaw`TRUNCATE TABLE "certifications" CASCADE`,
    prisma.$executeRaw`TRUNCATE TABLE "educations" CASCADE`,
    prisma.$executeRaw`TRUNCATE TABLE "community_comments" CASCADE`,
    prisma.$executeRaw`TRUNCATE TABLE "community_posts" CASCADE`,
    prisma.$executeRaw`TRUNCATE TABLE "job_applications" CASCADE`,
    prisma.$executeRaw`TRUNCATE TABLE "contact_logs" CASCADE`,
    prisma.$executeRaw`TRUNCATE TABLE "payments" CASCADE`,
    prisma.$executeRaw`TRUNCATE TABLE "professional_profiles" CASCADE`,
    prisma.$executeRaw`TRUNCATE TABLE "jobs" CASCADE`,
    prisma.$executeRaw`TRUNCATE TABLE "users" CASCADE`,
  ]);
}
