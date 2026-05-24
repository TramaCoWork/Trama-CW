import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { ProfessionCategoriesService } from './profession-categories.service';

describe('ProfessionCategoriesService', () => {
  let service: ProfessionCategoriesService;

  const mockPrisma = {
    professionCategory: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    professionalProfile: {
      count: jest.fn(),
    },
    document: {
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfessionCategoriesService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
      ],
    }).compile();

    service = module.get<ProfessionCategoriesService>(ProfessionCategoriesService);
  });

  it('adminCreateRubro crea rubro con slug autogenerado desde name', async () => {
    const created = { id: 1, name: 'Tecnología', slug: 'tecnologia' };
    mockPrisma.professionCategory.findFirst.mockResolvedValue(null);
    mockPrisma.professionCategory.create.mockResolvedValue(created);

    const result = await service.adminCreateRubro({ name: 'Tecnología' });

    expect(mockPrisma.professionCategory.findFirst).toHaveBeenCalledWith({
      where: { slug: 'tecnologia' },
      select: { id: true },
    });
    expect(mockPrisma.professionCategory.create).toHaveBeenCalledWith({
      data: {
        name: 'Tecnología',
        slug: 'tecnologia',
        level: 1,
        order: 0,
        isActive: true,
      },
    });
    expect(result).toEqual(created);
  });

  it('adminCreateRubro crea rubro con slug explícito', async () => {
    const created = { id: 2, name: 'Marketing', slug: 'slug-custom' };
    mockPrisma.professionCategory.findFirst.mockResolvedValue(null);
    mockPrisma.professionCategory.create.mockResolvedValue(created);

    await service.adminCreateRubro({ name: 'Marketing', slug: 'slug custom' });

    expect(mockPrisma.professionCategory.findFirst).toHaveBeenCalledWith({
      where: { slug: 'slug-custom' },
      select: { id: true },
    });
    expect(mockPrisma.professionCategory.create).toHaveBeenCalledWith({
      data: {
        name: 'Marketing',
        slug: 'slug-custom',
        level: 1,
        order: 0,
        isActive: true,
      },
    });
  });

  it('adminCreateRubro lanza ConflictException cuando slug ya existe', async () => {
    mockPrisma.professionCategory.findFirst.mockResolvedValue({ id: 99 });

    await expect(service.adminCreateRubro({ name: 'Tecnología', slug: 'tecnologia' })).rejects.toThrow(
      ConflictException,
    );

    expect(mockPrisma.professionCategory.findFirst).toHaveBeenCalledWith({
      where: { slug: 'tecnologia' },
      select: { id: true },
    });
    expect(mockPrisma.professionCategory.create).not.toHaveBeenCalled();
  });

  it('adminCreateSubrubro crea subrubro validando rubro padre existente', async () => {
    const created = { id: 10, name: 'Software', slug: 'software', level: 2, parentId: 1 };
    mockPrisma.professionCategory.findUnique.mockResolvedValue({ id: 1, level: 1, isActive: true });
    mockPrisma.professionCategory.findFirst.mockResolvedValue(null);
    mockPrisma.professionCategory.create.mockResolvedValue(created);

    const result = await service.adminCreateSubrubro({ name: 'Software', rubroId: 1 });

    expect(mockPrisma.professionCategory.findUnique).toHaveBeenCalledWith({
      where: { id: 1 },
      select: { id: true, level: true, isActive: true },
    });
    expect(mockPrisma.professionCategory.findFirst).toHaveBeenCalledWith({
      where: { slug: 'software' },
      select: { id: true },
    });
    expect(mockPrisma.professionCategory.create).toHaveBeenCalledWith({
      data: {
        name: 'Software',
        slug: 'software',
        level: 2,
        parentId: 1,
        order: 0,
        isActive: true,
      },
    });
    expect(result).toEqual(created);
  });

  it('adminCreateSubrubro lanza NotFoundException si rubro padre no existe', async () => {
    mockPrisma.professionCategory.findUnique.mockResolvedValue(null);

    await expect(service.adminCreateSubrubro({ name: 'Software', rubroId: 1 })).rejects.toThrow(
      NotFoundException,
    );

    expect(mockPrisma.professionCategory.findUnique).toHaveBeenCalledWith({
      where: { id: 1 },
      select: { id: true, level: true, isActive: true },
    });
    expect(mockPrisma.professionCategory.findFirst).not.toHaveBeenCalled();
    expect(mockPrisma.professionCategory.create).not.toHaveBeenCalled();
  });

  it('adminCreateProfesion crea profesion validando subrubro padre', async () => {
    const created = { id: 30, name: 'Backend', slug: 'backend', level: 3, parentId: 10 };
    mockPrisma.professionCategory.findUnique.mockResolvedValue({ id: 10, level: 2, isActive: true });
    mockPrisma.professionCategory.findFirst.mockResolvedValue(null);
    mockPrisma.professionCategory.create.mockResolvedValue(created);

    const result = await service.adminCreateProfesion({ name: 'Backend', subrubroId: 10 });

    expect(mockPrisma.professionCategory.findUnique).toHaveBeenCalledWith({
      where: { id: 10 },
      select: { id: true, level: true, isActive: true },
    });
    expect(mockPrisma.professionCategory.findFirst).toHaveBeenCalledWith({
      where: { slug: 'backend' },
      select: { id: true },
    });
    expect(mockPrisma.professionCategory.create).toHaveBeenCalledWith({
      data: {
        name: 'Backend',
        slug: 'backend',
        level: 3,
        parentId: 10,
        order: 0,
        isActive: true,
      },
    });
    expect(result).toEqual(created);
  });

  it('adminFindRubros lista rubros', async () => {
    const rubros = [{ id: 1, name: 'Tecnología', level: 1 }];
    mockPrisma.professionCategory.findMany.mockResolvedValue(rubros);

    const result = await service.adminFindRubros();

    expect(mockPrisma.professionCategory.findMany).toHaveBeenCalledWith({
      where: { level: 1 },
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
    });
    expect(result).toEqual(rubros);
  });

  it('adminFindRubro devuelve data cuando el rubro existe', async () => {
    const rubro = { id: 1, level: 1, name: 'Tecnología', children: [] };
    mockPrisma.professionCategory.findUnique.mockResolvedValue(rubro);

    const result = await service.adminFindRubro(1);

    expect(mockPrisma.professionCategory.findUnique).toHaveBeenCalledWith({
      where: { id: 1 },
      include: {
        parent: { select: { id: true, slug: true, name: true, level: true } },
        children: { orderBy: [{ order: 'asc' }, { name: 'asc' }] },
      },
    });
    expect(result).toEqual(rubro);
  });

  it('adminFindRubro lanza NotFoundException cuando rubro no existe', async () => {
    mockPrisma.professionCategory.findUnique.mockResolvedValue(null);

    await expect(service.adminFindRubro(999)).rejects.toThrow(NotFoundException);

    expect(mockPrisma.professionCategory.findUnique).toHaveBeenCalledWith({
      where: { id: 999 },
      include: {
        parent: { select: { id: true, slug: true, name: true, level: true } },
        children: { orderBy: [{ order: 'asc' }, { name: 'asc' }] },
      },
    });
  });

  it('adminDeactivateRubro desactiva rubro sin hijos activos', async () => {
    mockPrisma.professionCategory.findUnique.mockResolvedValue({ id: 1, level: 1 });
    mockPrisma.professionCategory.count.mockResolvedValue(0);
    mockPrisma.professionCategory.update.mockResolvedValue({ id: 1, isActive: false });

    const result = await service.adminDeactivateRubro(1);

    expect(mockPrisma.professionCategory.findUnique).toHaveBeenCalledWith({
      where: { id: 1 },
      select: { id: true, level: true },
    });
    expect(mockPrisma.professionCategory.count).toHaveBeenCalledWith({
      where: { parentId: 1, isActive: true },
    });
    expect(mockPrisma.professionCategory.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { isActive: false },
    });
    expect(result).toEqual({ message: 'Rubro desactivado' });
  });

  it('adminDeactivateRubro lanza BadRequestException si tiene subrubros activos', async () => {
    mockPrisma.professionCategory.findUnique.mockResolvedValue({ id: 1, level: 1 });
    mockPrisma.professionCategory.count.mockResolvedValue(2);

    await expect(service.adminDeactivateRubro(1)).rejects.toThrow(BadRequestException);

    expect(mockPrisma.professionCategory.findUnique).toHaveBeenCalledWith({
      where: { id: 1 },
      select: { id: true, level: true },
    });
    expect(mockPrisma.professionCategory.count).toHaveBeenCalledWith({
      where: { parentId: 1, isActive: true },
    });
    expect(mockPrisma.professionCategory.update).not.toHaveBeenCalled();
  });

  it('adminDeactivateSubrubro lanza BadRequestException si tiene profesiones activas', async () => {
    mockPrisma.professionCategory.findUnique.mockResolvedValue({ id: 10, level: 2 });
    mockPrisma.professionCategory.count.mockResolvedValue(1);

    await expect(service.adminDeactivateSubrubro(10)).rejects.toThrow(BadRequestException);

    expect(mockPrisma.professionCategory.findUnique).toHaveBeenCalledWith({
      where: { id: 10 },
      select: { id: true, level: true },
    });
    expect(mockPrisma.professionCategory.count).toHaveBeenCalledWith({
      where: { parentId: 10, isActive: true },
    });
    expect(mockPrisma.professionCategory.update).not.toHaveBeenCalled();
  });

  it('adminDeactivateProfesion desactiva profesion sin referencias', async () => {
    mockPrisma.professionCategory.findUnique.mockResolvedValue({ id: 30, level: 3 });
    mockPrisma.professionalProfile.count.mockResolvedValue(0);
    mockPrisma.document.count.mockResolvedValue(0);
    mockPrisma.professionCategory.update.mockResolvedValue({ id: 30, isActive: false });

    const result = await service.adminDeactivateProfesion(30);

    expect(mockPrisma.professionCategory.findUnique).toHaveBeenCalledWith({
      where: { id: 30 },
      select: { id: true, level: true },
    });
    expect(mockPrisma.professionalProfile.count).toHaveBeenCalledWith({
      where: { deletedAt: null, professionCategories: { some: { id: 30 } }, isActive: true },
    });
    expect(mockPrisma.document.count).toHaveBeenCalledWith({ where: { professionId: 30 } });
    expect(mockPrisma.professionCategory.update).toHaveBeenCalledWith({
      where: { id: 30 },
      data: { isActive: false },
    });
    expect(result).toEqual({ message: 'Profesion desactivada' });
  });

  it('adminDeactivateProfesion lanza BadRequestException si tiene profesionales asociados', async () => {
    mockPrisma.professionCategory.findUnique.mockResolvedValue({ id: 30, level: 3 });
    mockPrisma.professionalProfile.count.mockResolvedValue(1);
    mockPrisma.document.count.mockResolvedValue(0);

    await expect(service.adminDeactivateProfesion(30)).rejects.toThrow(BadRequestException);

    expect(mockPrisma.professionCategory.findUnique).toHaveBeenCalledWith({
      where: { id: 30 },
      select: { id: true, level: true },
    });
    expect(mockPrisma.professionalProfile.count).toHaveBeenCalledWith({
      where: { deletedAt: null, professionCategories: { some: { id: 30 } }, isActive: true },
    });
    expect(mockPrisma.document.count).toHaveBeenCalledWith({ where: { professionId: 30 } });
    expect(mockPrisma.professionCategory.update).not.toHaveBeenCalled();
  });

  it('adminUpdateRubro actualiza nombre', async () => {
    const updated = { id: 1, name: 'Nuevo Rubro' };
    mockPrisma.professionCategory.findUnique.mockResolvedValue({
      id: 1,
      name: 'Rubro',
      level: 1,
      slug: 'rubro',
    });
    mockPrisma.professionCategory.update.mockResolvedValue(updated);

    const result = await service.adminUpdateRubro(1, { name: ' Nuevo Rubro ' });

    expect(mockPrisma.professionCategory.findUnique).toHaveBeenCalledWith({
      where: { id: 1 },
      select: { id: true, name: true, level: true, slug: true },
    });
    expect(mockPrisma.professionCategory.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { name: 'Nuevo Rubro' },
    });
    expect(result).toEqual(updated);
  });

  it('adminUpdateSubrubro actualiza rubroId padre', async () => {
    const updated = { id: 10, parentId: 2 };
    mockPrisma.professionCategory.findUnique
      .mockResolvedValueOnce({ id: 10, name: 'Software', level: 2, slug: 'software' })
      .mockResolvedValueOnce({ id: 2, level: 1, isActive: true });
    mockPrisma.professionCategory.update.mockResolvedValue(updated);

    const result = await service.adminUpdateSubrubro(10, { rubroId: 2 });

    expect(mockPrisma.professionCategory.findUnique).toHaveBeenNthCalledWith(1, {
      where: { id: 10 },
      select: { id: true, name: true, level: true, slug: true },
    });
    expect(mockPrisma.professionCategory.findUnique).toHaveBeenNthCalledWith(2, {
      where: { id: 2 },
      select: { id: true, level: true, isActive: true },
    });
    expect(mockPrisma.professionCategory.update).toHaveBeenCalledWith({
      where: { id: 10 },
      data: { parent: { connect: { id: 2 } } },
    });
    expect(result).toEqual(updated);
  });
});
