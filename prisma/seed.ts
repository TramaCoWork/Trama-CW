import { PrismaClient, UserRole, ProfileStatus } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';
import { professionTaxonomy } from './profession-taxonomy';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL ?? 'postgresql://trama:trama_secret@localhost:5432/trama_cowork' });
const prisma = new PrismaClient({ adapter } as never);

async function seedProfessionCategories() {
  console.log('Seeding profession categories...');
  let order = 0;

  for (const level1 of professionTaxonomy) {
    const parent = await prisma.professionCategory.upsert({
      where: { slug: level1.slug },
      update: { name: level1.name, order: order++ },
      create: { slug: level1.slug, name: level1.name, order: order },
    });

    if (level1.children) {
      let subOrder = 0;
      for (const level2 of level1.children) {
        const sub = await prisma.professionCategory.upsert({
          where: { slug: level2.slug },
          update: { name: level2.name, parentId: parent.id, order: subOrder++ },
          create: { slug: level2.slug, name: level2.name, parentId: parent.id, order: subOrder },
        });

        if (level2.children) {
          let profOrder = 0;
          for (const level3 of level2.children) {
            await prisma.professionCategory.upsert({
              where: { slug: level3.slug },
              update: { name: level3.name, parentId: sub.id, order: profOrder++ },
              create: { slug: level3.slug, name: level3.name, parentId: sub.id, order: profOrder },
            });
          }
        }
      }
    }
  }
  console.log('Profession categories seeded ✓');
}

async function main() {
  console.log('Seeding...');

  // ── Categories ────────────────────────────────────────────────────────────
  const categories = await Promise.all([
    prisma.category.upsert({ where: { slug: 'design' },       update: {}, create: { slug: 'design',       name: 'Design' } }),
    prisma.category.upsert({ where: { slug: 'ux' },           update: {}, create: { slug: 'ux',           name: 'UX' } }),
    prisma.category.upsert({ where: { slug: 'consultants' },  update: {}, create: { slug: 'consultants',  name: 'Consultants' } }),
    prisma.category.upsert({ where: { slug: 'designers' },    update: {}, create: { slug: 'designers',    name: 'Designers' } }),
    prisma.category.upsert({ where: { slug: 'development' },  update: {}, create: { slug: 'development',  name: 'Development' } }),
    prisma.category.upsert({ where: { slug: 'marketing' },    update: {}, create: { slug: 'marketing',    name: 'Marketing' } }),
  ]);
  const [catDesign, catUx, catConsultants, catDesigners, catDevelopment, catMarketing] = categories;
  console.log('Categories:', categories.map((c) => c.slug).join(', '));

  // ── Admin ─────────────────────────────────────────────────────────────────
  const adminHash = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@trama.com' },
    update: {},
    create: { email: 'admin@trama.com', passwordHash: adminHash, role: UserRole.admin },
  });
  console.log('Admin:', admin.email);

  // ── Professionals ─────────────────────────────────────────────────────────
  const proHash = await bcrypt.hash('pro123456', 10);

  const pro1 = await prisma.user.upsert({
    where: { email: 'ana@trama.com' },
    update: {},
    create: { email: 'ana@trama.com', passwordHash: proHash, role: UserRole.professional },
  });
  await prisma.professionalProfile.upsert({
    where: { userId: pro1.id },
    update: {},
    create: {
      userId: pro1.id,
      name: 'Ana García',
      bio: 'Diseñadora UX con 5 años de experiencia en productos digitales.',
      city: 'Buenos Aires',
      categories: { connect: [{ id: catDesign.id }, { id: catUx.id }, { id: catDesigners.id }] },
      services: ['UX Design', 'UI Design', 'Wireframing'],
      priceMin: 50,
      priceMax: 150,
      whatsapp: '+5491112345678',
      emailContact: 'ana@example.com',
      isActive: true,
      profileStatus: ProfileStatus.active,
      completionPct: 100,
    },
  });
  console.log('Professional:', pro1.email);

  const pro2 = await prisma.user.upsert({
    where: { email: 'carlos@trama.com' },
    update: {},
    create: { email: 'carlos@trama.com', passwordHash: proHash, role: UserRole.professional },
  });
  await prisma.professionalProfile.upsert({
    where: { userId: pro2.id },
    update: {},
    create: {
      userId: pro2.id,
      name: 'Carlos Méndez',
      bio: 'Consultor de negocios y estrategia digital con más de 10 años de experiencia.',
      city: 'Córdoba',
      categories: { connect: [{ id: catConsultants.id }] },
      services: ['Business Strategy', 'Digital Transformation', 'Process Optimization'],
      priceMin: 80,
      priceMax: 200,
      emailContact: 'carlos@example.com',
      isActive: true,
      profileStatus: ProfileStatus.active,
      completionPct: 90,
    },
  });
  console.log('Professional:', pro2.email);

  const pro3 = await prisma.user.upsert({
    where: { email: 'lucia@trama.com' },
    update: {},
    create: { email: 'lucia@trama.com', passwordHash: proHash, role: UserRole.professional },
  });
  await prisma.professionalProfile.upsert({
    where: { userId: pro3.id },
    update: {},
    create: {
      userId: pro3.id,
      name: 'Lucía Torres',
      bio: 'Desarrolladora fullstack especializada en React y Node.js.',
      city: 'Buenos Aires',
      categories: { connect: [{ id: catDevelopment.id }] },
      services: ['Frontend Development', 'Backend Development', 'API Design'],
      priceMin: 60,
      priceMax: 180,
      whatsapp: '+5491198765432',
      isActive: true,
      profileStatus: ProfileStatus.active,
      completionPct: 95,
    },
  });
  console.log('Professional:', pro3.email);

  const pro4 = await prisma.user.upsert({
    where: { email: 'martin@trama.com' },
    update: {},
    create: { email: 'martin@trama.com', passwordHash: proHash, role: UserRole.professional },
  });
  await prisma.professionalProfile.upsert({
    where: { userId: pro4.id },
    update: {},
    create: {
      userId: pro4.id,
      name: 'Martín Rojas',
      bio: 'Especialista en marketing digital y growth hacking para startups.',
      city: 'Rosario',
      categories: { connect: [{ id: catMarketing.id }, { id: catConsultants.id }] },
      services: ['SEO', 'Content Strategy', 'Paid Ads', 'Growth Hacking'],
      priceMin: 40,
      priceMax: 120,
      emailContact: 'martin@example.com',
      whatsapp: '+5493412345678',
      isActive: true,
      profileStatus: ProfileStatus.active,
      completionPct: 100,
    },
  });
  console.log('Professional:', pro4.email);

  // ── Clients ───────────────────────────────────────────────────────────────
  const clientHash = await bcrypt.hash('client123', 10);

  const client1 = await prisma.user.upsert({
    where: { email: 'client@trama.com' },
    update: {},
    create: { email: 'client@trama.com', passwordHash: clientHash, role: UserRole.client },
  });
  console.log('Client:', client1.email);

  const client2 = await prisma.user.upsert({
    where: { email: 'sofia@trama.com' },
    update: {},
    create: { email: 'sofia@trama.com', passwordHash: clientHash, role: UserRole.client },
  });
  console.log('Client:', client2.email);

  // ── Jobs ──────────────────────────────────────────────────────────────────
  const job1 = await prisma.job.upsert({
    where: { id: 'seed-job-1' },
    update: {},
    create: {
      id: 'seed-job-1',
      title: 'Diseñador UX para startup',
      description: 'Buscamos diseñador UX con experiencia en apps móviles para proyecto de 3 meses.',
      createdByAdmin: true,
      isActive: true,
    },
  });
  console.log('Job:', job1.title);

  const job2 = await prisma.job.upsert({
    where: { id: 'seed-job-2' },
    update: {},
    create: {
      id: 'seed-job-2',
      title: 'Consultor de estrategia digital',
      description: 'Empresa en crecimiento busca consultor para definir roadmap digital 2026.',
      createdByAdmin: true,
      isActive: true,
    },
  });
  console.log('Job:', job2.title);

  // ── Community posts ───────────────────────────────────────────────────────
  await prisma.communityPost.upsert({
    where: { id: 'seed-post-1' },
    update: {},
    create: {
      id: 'seed-post-1',
      userId: pro1.id,
      content: '¡Hola a todos! Soy nueva en la plataforma. Especialista en diseño UX. ¿Algún consejo para conseguir mis primeros clientes?',
    },
  });

  await prisma.communityPost.upsert({
    where: { id: 'seed-post-2' },
    update: {},
    create: {
      id: 'seed-post-2',
      userId: pro2.id,
      content: 'Comparto mi experiencia: las primeras semanas son clave para construir reputación. Respondan rápido y sean transparentes con los presupuestos.',
    },
  });
  console.log('Community posts created');

  // ── Profession Categories ─────────────────────────────────────────────────
  await seedProfessionCategories();

  console.log('Seed complete ✓');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
