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
    },
  };

  let service: ExternalJobPostingsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ExternalJobPostingsService(prisma as any);
    prisma.externalJobPosting.count.mockResolvedValue(0);
    prisma.externalJobPosting.findMany.mockResolvedValue([]);
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
  });

  describe('listPostings — ordering', () => {
    it('orders by publishedAt descending', async () => {
      await service.listPostings({ page: 1, limit: 20 });

      expect(prisma.externalJobPosting.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { publishedAt: 'desc' } }),
      );
    });
  });
});
