import { PrismaService } from '../src/prisma/prisma.service';

export async function seedTestCategories(
  prismaService: PrismaService,
): Promise<number> {
  const rubro = await prismaService.professionCategory.upsert({
    where: { slug: 'test-rubro' },
    update: {
      name: 'Test Rubro',
      level: 1,
      parentId: null,
      order: 0,
    },
    create: {
      slug: 'test-rubro',
      name: 'Test Rubro',
      level: 1,
      order: 0,
    },
  });

  const subrubro = await prismaService.professionCategory.upsert({
    where: { slug: 'test-subrubro' },
    update: {
      name: 'Test Subrubro',
      level: 2,
      parentId: rubro.id,
      order: 0,
    },
    create: {
      slug: 'test-subrubro',
      name: 'Test Subrubro',
      level: 2,
      parentId: rubro.id,
      order: 0,
    },
  });

  await prismaService.professionCategory.upsert({
    where: { slug: 'test-profession' },
    update: {
      name: 'Test Profession',
      level: 3,
      parentId: subrubro.id,
      order: 0,
    },
    create: {
      slug: 'test-profession',
      name: 'Test Profession',
      level: 3,
      parentId: subrubro.id,
      order: 0,
    },
  });

  return rubro.id;
}
