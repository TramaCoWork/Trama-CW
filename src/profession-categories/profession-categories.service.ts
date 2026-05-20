import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { CreateProfesionDto } from './dto/create-profesion.dto';
import { CreateRubroDto } from './dto/create-rubro.dto';
import { CreateSubrubroDto } from './dto/create-subrubro.dto';
import { UpdateProfesionDto } from './dto/update-profesion.dto';
import { UpdateRubroDto } from './dto/update-rubro.dto';
import { UpdateSubrubroDto } from './dto/update-subrubro.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProfessionCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  private normalizeSlug(value: string) {
    return value
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private async resolveSlug(name: string, rawSlug?: string, excludeId?: number) {
    const slug = this.normalizeSlug(rawSlug ?? name);
    if (!slug) throw new BadRequestException('El slug no puede quedar vacio');

    const existing = await this.prisma.professionCategory.findFirst({
      where: { slug, ...(excludeId !== undefined ? { id: { not: excludeId } } : {}) },
      select: { id: true },
    });

    if (existing) throw new ConflictException('Ya existe una categoria con ese slug');

    return slug;
  }

  /** Arbol completo (3 niveles) */
  async findAll() {
    return this.prisma.professionCategory.findMany({
      where: { isActive: true, level: 1 },
      orderBy: { order: 'asc' },
      include: {
        children: {
          where: { isActive: true },
          orderBy: { order: 'asc' },
          include: {
            children: {
              where: { isActive: true },
              orderBy: { order: 'asc' },
            },
          },
        },
      },
    });
  }

  /** Solo rubros (nivel 1) para selector de registro */
  async findRubros() {
    return this.prisma.professionCategory.findMany({
      where: { isActive: true, level: 1 },
      orderBy: { order: 'asc' },
      select: { id: true, slug: true, name: true },
    });
  }

  /** Profesiones de un rubro, agrupadas por sub-rubro */
  async findProfessionsByRubro(rubroId: number) {
    const rubro = await this.prisma.professionCategory.findFirst({
      where: { id: rubroId, level: 1, isActive: true },
    });

    if (!rubro) {
      throw new NotFoundException('Rubro no encontrado');
    }

    return this.prisma.professionCategory.findMany({
      where: { parentId: rubroId, isActive: true, level: 2 },
      orderBy: { order: 'asc' },
      include: {
        children: {
          where: { isActive: true, level: 3 },
          orderBy: { order: 'asc' },
          select: { id: true, slug: true, name: true },
        },
      },
    });
  }

  /** Subcategorias de un padre */
  async findChildren(parentId: number) {
    return this.prisma.professionCategory.findMany({
      where: { parentId, isActive: true },
      orderBy: { order: 'asc' },
      include: {
        children: {
          where: { isActive: true },
          orderBy: { order: 'asc' },
        },
      },
    });
  }

  async adminFindRubros() {
    return this.prisma.professionCategory.findMany({
      where: { level: 1 },
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
    });
  }

  async adminFindRubro(id: number) {
    const rubro = await this.prisma.professionCategory.findUnique({
      where: { id },
      include: {
        parent: { select: { id: true, slug: true, name: true, level: true } },
        children: { orderBy: [{ order: 'asc' }, { name: 'asc' }] },
      },
    });
    if (!rubro || rubro.level !== 1) throw new NotFoundException('Rubro no encontrado');
    return rubro;
  }

  async adminCreateRubro(dto: CreateRubroDto) {
    const slug = await this.resolveSlug(dto.name, dto.slug);
    return this.prisma.professionCategory.create({
      data: {
        name: dto.name.trim(),
        slug,
        level: 1,
        order: dto.order ?? 0,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async adminUpdateRubro(id: number, dto: UpdateRubroDto) {
    const rubro = await this.prisma.professionCategory.findUnique({
      where: { id },
      select: { id: true, name: true, level: true, slug: true },
    });
    if (!rubro || rubro.level !== 1) throw new NotFoundException('Rubro no encontrado');

    const data: Prisma.ProfessionCategoryUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.slug !== undefined) data.slug = await this.resolveSlug(dto.name ?? rubro.name, dto.slug, id);
    if (dto.order !== undefined) data.order = dto.order;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;

    return this.prisma.professionCategory.update({ where: { id }, data });
  }

  async adminDeactivateRubro(id: number) {
    const rubro = await this.prisma.professionCategory.findUnique({
      where: { id },
      select: { id: true, level: true },
    });
    if (!rubro || rubro.level !== 1) throw new NotFoundException('Rubro no encontrado');

    const activeChildren = await this.prisma.professionCategory.count({
      where: { parentId: id, isActive: true },
    });
    if (activeChildren > 0) {
      throw new BadRequestException('No se puede desactivar: el rubro tiene subrubros activos');
    }

    await this.prisma.professionCategory.update({ where: { id }, data: { isActive: false } });
    return { message: 'Rubro desactivado' };
  }

  async adminFindSubrubros(rubroId?: number) {
    const where: Prisma.ProfessionCategoryWhereInput = { level: 2 };
    if (rubroId !== undefined) {
      await this.ensureCategoryExists(rubroId, 1);
      where.parentId = rubroId;
    }
    return this.prisma.professionCategory.findMany({
      where,
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
      include: {
        _count: {
          select: { children: true },
        },
      },
    });
  }

  async adminFindSubrubro(id: number) {
    const sub = await this.prisma.professionCategory.findUnique({
      where: { id },
      include: {
        parent: { select: { id: true, slug: true, name: true, level: true } },
        children: { orderBy: [{ order: 'asc' }, { name: 'asc' }] },
      },
    });
    if (!sub || sub.level !== 2) throw new NotFoundException('Subrubro no encontrado');
    return sub;
  }

  async adminCreateSubrubro(dto: CreateSubrubroDto) {
    await this.ensureCategoryExists(dto.rubroId, 1);
    const slug = await this.resolveSlug(dto.name, dto.slug);
    return this.prisma.professionCategory.create({
      data: {
        name: dto.name.trim(),
        slug,
        level: 2,
        parentId: dto.rubroId,
        order: dto.order ?? 0,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async adminUpdateSubrubro(id: number, dto: UpdateSubrubroDto) {
    const sub = await this.prisma.professionCategory.findUnique({
      where: { id },
      select: { id: true, name: true, level: true, slug: true },
    });
    if (!sub || sub.level !== 2) throw new NotFoundException('Subrubro no encontrado');

    const data: Prisma.ProfessionCategoryUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.slug !== undefined) data.slug = await this.resolveSlug(dto.name ?? sub.name, dto.slug, id);
    if (dto.order !== undefined) data.order = dto.order;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.rubroId !== undefined) {
      await this.ensureCategoryExists(dto.rubroId, 1);
      data.parent = { connect: { id: dto.rubroId } };
    }

    return this.prisma.professionCategory.update({ where: { id }, data });
  }

  async adminDeactivateSubrubro(id: number) {
    const sub = await this.prisma.professionCategory.findUnique({
      where: { id },
      select: { id: true, level: true },
    });
    if (!sub || sub.level !== 2) throw new NotFoundException('Subrubro no encontrado');

    const activeChildren = await this.prisma.professionCategory.count({
      where: { parentId: id, isActive: true },
    });
    if (activeChildren > 0) {
      throw new BadRequestException('No se puede desactivar: el subrubro tiene profesiones activas');
    }

    await this.prisma.professionCategory.update({ where: { id }, data: { isActive: false } });
    return { message: 'Subrubro desactivado' };
  }

  async adminFindProfesiones(subrubroId?: number) {
    const where: Prisma.ProfessionCategoryWhereInput = { level: 3 };
    if (subrubroId !== undefined) {
      await this.ensureCategoryExists(subrubroId, 2);
      where.parentId = subrubroId;
    }
    return this.prisma.professionCategory.findMany({
      where,
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
    });
  }

  async adminFindProfesion(id: number) {
    const prof = await this.prisma.professionCategory.findUnique({
      where: { id },
      include: {
        parent: { select: { id: true, slug: true, name: true, level: true } },
      },
    });
    if (!prof || prof.level !== 3) throw new NotFoundException('Profesion no encontrada');
    return prof;
  }

  async adminCreateProfesion(dto: CreateProfesionDto) {
    await this.ensureCategoryExists(dto.subrubroId, 2);
    const slug = await this.resolveSlug(dto.name, dto.slug);
    return this.prisma.professionCategory.create({
      data: {
        name: dto.name.trim(),
        slug,
        level: 3,
        parentId: dto.subrubroId,
        order: dto.order ?? 0,
        isActive: dto.isActive ?? true,
      },
    });
  }

  async adminUpdateProfesion(id: number, dto: UpdateProfesionDto) {
    const prof = await this.prisma.professionCategory.findUnique({
      where: { id },
      select: { id: true, name: true, level: true, slug: true },
    });
    if (!prof || prof.level !== 3) throw new NotFoundException('Profesion no encontrada');

    const data: Prisma.ProfessionCategoryUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.slug !== undefined) {
      data.slug = await this.resolveSlug(dto.name ?? prof.name, dto.slug, id);
    }
    if (dto.order !== undefined) data.order = dto.order;
    if (dto.isActive !== undefined) data.isActive = dto.isActive;
    if (dto.subrubroId !== undefined) {
      await this.ensureCategoryExists(dto.subrubroId, 2);
      data.parent = { connect: { id: dto.subrubroId } };
    }

    return this.prisma.professionCategory.update({ where: { id }, data });
  }

  async adminDeactivateProfesion(id: number) {
    const prof = await this.prisma.professionCategory.findUnique({
      where: { id },
      select: { id: true, level: true },
    });
    if (!prof || prof.level !== 3) throw new NotFoundException('Profesion no encontrada');

    const [professionalsCount, docsCount] = await Promise.all([
      this.prisma.professionalProfile.count({
        where: { professionCategories: { some: { id } }, isActive: true },
      }),
      this.prisma.document.count({ where: { professionId: id } }),
    ]);

    if (professionalsCount > 0 || docsCount > 0) {
      throw new BadRequestException(
        'No se puede desactivar: la profesion tiene profesionales o documentos asociados',
      );
    }

    await this.prisma.professionCategory.update({ where: { id }, data: { isActive: false } });
    return { message: 'Profesion desactivada' };
  }

  private async ensureCategoryExists(id: number, level: number) {
    const cat = await this.prisma.professionCategory.findUnique({
      where: { id },
      select: { id: true, level: true, isActive: true },
    });
    if (!cat || cat.level !== level) {
      const label = level === 1 ? 'Rubro' : 'Subrubro';
      throw new NotFoundException(`${label} no encontrado`);
    }
    if (!cat.isActive) {
      const label = level === 1 ? 'Rubro' : 'Subrubro';
      throw new BadRequestException(`${label} padre inactivo`);
    }
    return cat;
  }
}
