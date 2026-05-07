import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ProfessionCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

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
}
