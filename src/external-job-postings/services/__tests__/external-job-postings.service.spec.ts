import { validate } from 'class-validator';
import { ListExternalJobPostingsDto } from '../../dto/list-external-job-postings.dto';
import { ExternalJobPostingsService } from '../external-job-postings.service';

const makePosting = (overrides: Record<string, unknown> = {}) => ({
  id: 'post-1',
  source: 'getonboard',
  externalId: 'gob-1',
  title: 'Developer',
  link: 'https://getonbrd.com/1',
  categoryName: 'Programming',
  publishedAt: new Date('2026-08-18T12:00:00Z'),
  createdAt: new Date('2026-08-18T12:00:00Z'),
  ...overrides,
});

describe('ExternalJobPostingsService', () => {
  const prisma = {
    externalJobPosting: {
      findMany: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
    },
  };

  let service: ExternalJobPostingsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ExternalJobPostingsService(prisma as any);
    prisma.externalJobPosting.count.mockResolvedValue(0);
    prisma.externalJobPosting.findMany.mockResolvedValue([]);
    prisma.externalJobPosting.groupBy.mockResolvedValue([]);
  });

  describe('listPostings — pagination', () => {
    it('returns correct pagination metadata for the first page', async () => {
      prisma.externalJobPosting.findMany.mockResolvedValueOnce([makePosting()]);
      prisma.externalJobPosting.count.mockResolvedValueOnce(50);

      const result = await service.listPostings({
        page: 1,
        limit: 10,
      });

      expect(result.pagination).toEqual({
        page: 1,
        limit: 10,
        total: 50,
        totalPages: 5,
      });
    });

    it('returns totalPages=0 when total is 0', async () => {
      const result = await service.listPostings({ page: 1, limit: 20 });

      expect(result.pagination.totalPages).toBe(0);
    });

    it('applies correct skip/take for page 2', async () => {
      prisma.externalJobPosting.count.mockResolvedValueOnce(50);

      await service.listPostings({ page: 2, limit: 10 });

      expect(prisma.externalJobPosting.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 }),
      );
    });
  });

  describe('listPostings — filtering', () => {
    it('adds source filter when provided', async () => {
      await service.listPostings({ page: 1, limit: 20, source: 'getonboard' });

      expect(prisma.externalJobPosting.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ source: 'getonboard' }),
        }),
      );
    });

    it('adds ILIKE categoryName filter when provided', async () => {
      await service.listPostings({
        page: 1,
        limit: 20,
        categoryName: 'prog',
      });

      expect(prisma.externalJobPosting.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            categoryName: { contains: 'prog', mode: 'insensitive' },
          }),
        }),
      );
    });

    it('always applies soft-delete filter (deletedAt: null)', async () => {
      await service.listPostings({ page: 1, limit: 20 });

      expect(prisma.externalJobPosting.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ deletedAt: null }),
        }),
      );
    });

    it('listPostings with q parameter filters by title OR categoryName with case-insensitive matching', async () => {
      await service.listPostings({ page: 1, limit: 20, q: 'developer' });

      expect(prisma.externalJobPosting.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({
                title: expect.objectContaining({ contains: 'developer', mode: 'insensitive' }),
              }),
              expect.objectContaining({
                categoryName: expect.objectContaining({ contains: 'developer', mode: 'insensitive' }),
              }),
            ]),
          }),
        }),
      );
    });

    it('listPostings combines q and categoryName as AND semantics', async () => {
      await service.listPostings({
        page: 1,
        limit: 20,
        q: 'developer',
        categoryName: 'Programming',
      });

      expect(prisma.externalJobPosting.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            categoryName: { contains: 'Programming', mode: 'insensitive' },
            OR: expect.arrayContaining([
              expect.objectContaining({ title: expect.objectContaining({ contains: 'developer' }) }),
              expect.objectContaining({ categoryName: expect.objectContaining({ contains: 'developer' }) }),
            ]),
          }),
        }),
      );
    });

    it('listPostings ignores empty or whitespace-only q parameter', async () => {
      await service.listPostings({ page: 1, limit: 20, q: '   ' });

      const call = prisma.externalJobPosting.findMany.mock.calls[0][0] as { where: Record<string, unknown> };
      expect(call.where).not.toHaveProperty('OR');
    });
  });

  describe('listPostings — ordering', () => {
    it('orders by publishedAt descending', async () => {
      await service.listPostings({ page: 1, limit: 20 });

      expect(prisma.externalJobPosting.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { publishedAt: 'desc' } }),
      );
    });
  });

  describe('getCategoryCounts', () => {
    it('returns categories sorted by count DESC and excludes null categoryName', async () => {
      prisma.externalJobPosting.groupBy.mockResolvedValueOnce([
        { categoryName: 'Programming', _count: { categoryName: 42 } },
        { categoryName: 'Design', _count: { categoryName: 17 } },
        { categoryName: 'Sales', _count: { categoryName: 8 } },
      ]);

      const result = await service.getCategoryCounts();

      expect(result).toEqual([
        { categoryName: 'Programming', count: 42 },
        { categoryName: 'Design', count: 17 },
        { categoryName: 'Sales', count: 8 },
      ]);
    });

    it('passes soft-delete and null-exclusion filters to groupBy where clause', async () => {
      await service.getCategoryCounts();

      expect(prisma.externalJobPosting.groupBy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            deletedAt: null,
            categoryName: { not: null },
          }),
        }),
      );
    });

    it('returns empty array when no active categories exist', async () => {
      prisma.externalJobPosting.groupBy.mockResolvedValueOnce([]);

      const result = await service.getCategoryCounts();

      expect(result).toEqual([]);
    });
  });
});

describe('ListExternalJobPostingsDto — validation', () => {
  it('@Max(100) rejects limit > 100', async () => {
    const dto = new ListExternalJobPostingsDto();
    dto.limit = 101;

    const errors = await validate(dto);

    expect(errors.some((e) => e.property === 'limit')).toBe(true);
  });

  it('@Max(100) accepts limit = 100', async () => {
    const dto = new ListExternalJobPostingsDto();
    dto.limit = 100;

    const errors = await validate(dto);

    expect(errors.every((e) => e.property !== 'limit')).toBe(true);
  });
});
