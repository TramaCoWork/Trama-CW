import { ExternalJobPostingsCronService } from '../external-job-postings-cron.service';
import type { ExternalJobSourceStrategy } from '../../strategies/external-job-source-strategy.interface';

const makeJob = (id: string) => ({
  externalId: id,
  title: 'Job',
  link: `https://x.com/${id}`,
  categoryName: 'Tech',
  publishedAt: new Date(),
  raw: { id },
});

describe('ExternalJobPostingsCronService.handleSync', () => {
  const prisma = {
    cronJob: { findMany: jest.fn(), findUnique: jest.fn() },
    jobExecution: { create: jest.fn(), update: jest.fn() },
  };
  const bulkWriter = { upsertJobs: jest.fn() };
  const schedulerRegistry = { addCronJob: jest.fn() };
  const configService = {};

  function buildService(strategies: ExternalJobSourceStrategy[]) {
    return new ExternalJobPostingsCronService(
      prisma as any,
      configService as any,
      schedulerRegistry as any,
      strategies,
      bulkWriter as any,
    );
  }

  beforeEach(() => {
    jest.clearAllMocks();
    bulkWriter.upsertJobs.mockResolvedValue({ inserted: 1, updated: 0, skipped: 0 });
  });

  it('calls bulkWriter for each successful strategy and returns total processed', async () => {
    const stratA: ExternalJobSourceStrategy = {
      source: 'stub-a',
      fetchJobs: jest
        .fn()
        .mockResolvedValueOnce({ jobs: [makeJob('a1')], hasMore: false }),
    };
    const stratB: ExternalJobSourceStrategy = {
      source: 'stub-b',
      fetchJobs: jest
        .fn()
        .mockResolvedValueOnce({ jobs: [makeJob('b1'), makeJob('b2')], hasMore: false }),
    };

    bulkWriter.upsertJobs
      .mockResolvedValueOnce({ inserted: 1, updated: 0, skipped: 0 })
      .mockResolvedValueOnce({ inserted: 2, updated: 0, skipped: 0 });

    const service = buildService([stratA, stratB]);
    const result = await service.handleSync();

    expect(bulkWriter.upsertJobs).toHaveBeenCalledTimes(2);
    expect(result.processedCount).toBe(3);
  });

  it('catches error from one strategy, continues with next, and reports failedSources in metadata', async () => {
    const failing: ExternalJobSourceStrategy = {
      source: 'failing-source',
      fetchJobs: jest.fn().mockRejectedValueOnce(new Error('API returned 500')),
    };
    const succeeding: ExternalJobSourceStrategy = {
      source: 'succeeding-source',
      fetchJobs: jest
        .fn()
        .mockResolvedValueOnce({ jobs: [makeJob('s1')], hasMore: false }),
    };

    const service = buildService([failing, succeeding]);
    const result = await service.handleSync();

    // failing strategy: bulkWriter NOT called (no partial data persisted)
    expect(bulkWriter.upsertJobs).toHaveBeenCalledTimes(1);
    expect(bulkWriter.upsertJobs).toHaveBeenCalledWith(
      'succeeding-source',
      expect.any(Array),
    );

    // failedSources reported in metadata
    expect(result.metadata).toEqual(
      expect.objectContaining({
        failedSources: ['failing-source'],
      }),
    );
    // Overall processedCount is from the succeeding strategy only
    expect(result.processedCount).toBe(1);
  });

  it('paginates until hasMore=false', async () => {
    const strategy: ExternalJobSourceStrategy = {
      source: 'paginated',
      fetchJobs: jest
        .fn()
        .mockResolvedValueOnce({ jobs: [makeJob('p1')], hasMore: true })
        .mockResolvedValueOnce({ jobs: [makeJob('p2')], hasMore: false }),
    };

    bulkWriter.upsertJobs.mockResolvedValueOnce({ inserted: 2, updated: 0, skipped: 0 });

    const service = buildService([strategy]);
    const result = await service.handleSync();

    expect(strategy.fetchJobs).toHaveBeenCalledTimes(2);
    expect(result.processedCount).toBe(2);
  });

  it('returns no metadata.failedSources when all strategies succeed', async () => {
    const strategy: ExternalJobSourceStrategy = {
      source: 'ok',
      fetchJobs: jest
        .fn()
        .mockResolvedValueOnce({ jobs: [makeJob('x1')], hasMore: false }),
    };

    const service = buildService([strategy]);
    const result = await service.handleSync();

    expect(result.metadata).toBeUndefined();
  });
});
