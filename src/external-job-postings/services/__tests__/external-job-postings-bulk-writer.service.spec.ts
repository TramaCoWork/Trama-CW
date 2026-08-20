import { ExternalJobPostingsBulkWriterService } from '../external-job-postings-bulk-writer.service';
import type { ExternalJobDto } from '../../strategies/external-job-source-strategy.interface';

const makeJobDto = (overrides: Partial<ExternalJobDto> = {}): ExternalJobDto => ({
  externalId: 'gob-1',
  title: 'Developer',
  link: 'https://example.com/jobs/1',
  categoryName: 'Programming',
  publishedAt: new Date('2026-08-18T12:00:00Z'),
  raw: { id: 'gob-1' },
  ...overrides,
});

describe('ExternalJobPostingsBulkWriterService', () => {
  const prisma = {
    externalJobPosting: {
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  let service: ExternalJobPostingsBulkWriterService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ExternalJobPostingsBulkWriterService(prisma as any);
  });

  describe('upsertJobs — new job (insert)', () => {
    it('creates a new record when no existing job found', async () => {
      prisma.externalJobPosting.findFirst.mockResolvedValueOnce(null);
      prisma.externalJobPosting.create.mockResolvedValueOnce({ id: 'new-id' });

      const result = await service.upsertJobs('getonboard', [makeJobDto()]);

      expect(prisma.externalJobPosting.create).toHaveBeenCalledTimes(1);
      expect(prisma.externalJobPosting.update).not.toHaveBeenCalled();
      expect(result).toEqual({ inserted: 1, updated: 0, skipped: 0 });
    });

    it('uses (source, link) as dedup key when externalId is null', async () => {
      const job = makeJobDto({ externalId: null });
      prisma.externalJobPosting.findFirst.mockResolvedValueOnce(null);
      prisma.externalJobPosting.create.mockResolvedValueOnce({ id: 'new-id' });

      await service.upsertJobs('getonboard', [job]);

      expect(prisma.externalJobPosting.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { source: 'getonboard', link: job.link },
        }),
      );
    });
  });

  describe('upsertJobs — existing job (update)', () => {
    it('updates mutable fields when record already exists', async () => {
      prisma.externalJobPosting.findFirst.mockResolvedValueOnce({ id: 'existing-id' });
      prisma.externalJobPosting.update.mockResolvedValueOnce({ id: 'existing-id' });

      const job = makeJobDto({ title: 'Updated Developer Title' });
      const result = await service.upsertJobs('getonboard', [job]);

      expect(prisma.externalJobPosting.update).toHaveBeenCalledWith({
        where: { id: 'existing-id' },
        data: expect.objectContaining({
          title: 'Updated Developer Title',
          deletedAt: null,
        }),
      });
      expect(result).toEqual({ inserted: 0, updated: 1, skipped: 0 });
    });

    it('sets deletedAt=null when updating a soft-deleted record (resurrection)', async () => {
      const deletedAt = new Date('2026-08-01T00:00:00Z');
      prisma.externalJobPosting.findFirst.mockResolvedValueOnce({
        id: 'deleted-id',
        deletedAt,
      });
      prisma.externalJobPosting.update.mockResolvedValueOnce({ id: 'deleted-id' });

      const result = await service.upsertJobs('getonboard', [makeJobDto()]);

      expect(prisma.externalJobPosting.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ deletedAt: null }),
        }),
      );
      expect(result.updated).toBe(1);
      expect(result.inserted).toBe(0);
    });
  });

  describe('upsertJobs — multiple jobs', () => {
    it('returns correct totals across mixed insert/update operations', async () => {
      prisma.externalJobPosting.findFirst
        .mockResolvedValueOnce(null) // first: new
        .mockResolvedValueOnce({ id: 'existing' }); // second: existing
      prisma.externalJobPosting.create.mockResolvedValueOnce({ id: 'new' });
      prisma.externalJobPosting.update.mockResolvedValueOnce({ id: 'existing' });

      const jobs = [
        makeJobDto({ externalId: 'a', link: 'https://x.com/1' }),
        makeJobDto({ externalId: 'b', link: 'https://x.com/2' }),
      ];
      const result = await service.upsertJobs('getonboard', jobs);

      expect(result).toEqual({ inserted: 1, updated: 1, skipped: 0 });
    });
  });
});
