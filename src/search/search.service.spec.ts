import { SearchService } from './search.service';

describe('SearchService.search (paginacion)', () => {
  const prisma = {
    professionalProfile: { findMany: jest.fn(), count: jest.fn() },
  };

  let service: SearchService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SearchService(prisma as any);
    prisma.professionalProfile.findMany.mockResolvedValue([{ id: 'p-1' }]);
    prisma.professionalProfile.count.mockResolvedValue(35);
  });

  it('devuelve { data, meta } con defaults (page 1, limit 20)', async () => {
    const res = await service.search({});

    const call = prisma.professionalProfile.findMany.mock.calls[0][0];
    expect(call.skip).toBe(0);
    expect(call.take).toBe(20);
    expect(res).toEqual({
      data: [{ id: 'p-1' }],
      meta: { page: 1, limit: 20, total: 35, totalPages: 2 },
    });
  });

  it('respeta page/limit', async () => {
    await service.search({ page: '3', limit: '10' });
    const call = prisma.professionalProfile.findMany.mock.calls[0][0];
    expect(call.skip).toBe(20);
    expect(call.take).toBe(10);
  });

  it('clampea limit al maximo (100) y page minimo 1', async () => {
    await service.search({ page: '0', limit: '500' });
    const call = prisma.professionalProfile.findMany.mock.calls[0][0];
    expect(call.take).toBe(100);
    expect(call.skip).toBe(0); // page forzado a 1
  });

  it('aplica el gate publico (validatedAt + active + pago)', async () => {
    await service.search({});
    const call = prisma.professionalProfile.findMany.mock.calls[0][0];
    expect(call.where).toEqual(
      expect.objectContaining({
        isActive: true,
        hideProfile: false,
        profileStatus: 'active',
        validatedAt: { not: null },
      }),
    );
  });
});
