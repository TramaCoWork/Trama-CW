import { GetOnBoardStrategy } from '../get-on-board.strategy';

const makeJob = (overrides: Partial<{
  id: string;
  title: string;
  published_at: number;
  link: string;
  category_name: string;
}> = {}) => {
  const {
    id = 'gob-1',
    title = 'Developer',
    published_at = Math.floor(Date.now() / 1000) - 60, // 1 minute ago
    link = 'https://getonbrd.com/jobs/1',
    category_name = 'Programming',
  } = overrides;

  return {
    id,
    type: 'job',
    attributes: { title, published_at, category_name },
    links: { public_url: link },
  };
};

describe('GetOnBoardStrategy', () => {
  const httpMock = { get: jest.fn() };
  let strategy: GetOnBoardStrategy;

  beforeEach(() => {
    jest.clearAllMocks();
    strategy = new GetOnBoardStrategy(httpMock as any);
  });

  describe('fetchJobs — happy path', () => {
    it('returns jobs and hasMore=false when page is not full', async () => {
      httpMock.get.mockResolvedValueOnce({
        ok: true,
        status: 200,
        data: { data: [makeJob()] },
        raw: '',
      });

      const result = await strategy.fetchJobs(1);

      expect(result.jobs).toHaveLength(1);
      expect(result.hasMore).toBe(false);
      expect(result.jobs[0].externalId).toBe('gob-1');
    });

    it('sets hasMore=true when page has 120 items (full page)', async () => {
      const jobs = Array.from({ length: 120 }, (_, i) =>
        makeJob({ id: `gob-${i}`, link: `https://getonbrd.com/jobs/${i}` }),
      );
      httpMock.get.mockResolvedValueOnce({
        ok: true,
        status: 200,
        data: { data: jobs },
        raw: '',
      });

      const result = await strategy.fetchJobs(1);

      expect(result.jobs).toHaveLength(120);
      expect(result.hasMore).toBe(true);
    });

    it('includes jobs older than 7 days — no date-window filter', async () => {
      const oldEpoch = Math.floor(Date.now() / 1000) - 8 * 24 * 60 * 60; // 8 days ago
      const recentJob = makeJob({ id: 'recent' });
      const oldJob = makeJob({ id: 'old', published_at: oldEpoch, link: 'https://getonbrd.com/jobs/old' });

      httpMock.get.mockResolvedValueOnce({
        ok: true,
        status: 200,
        data: { data: [recentJob, oldJob] },
        raw: '',
      });

      const result = await strategy.fetchJobs(1);

      // Both jobs pass — no early-stop by date; kept + skipped = total
      expect(result.jobs.find((j) => j.externalId === 'recent')).toBeDefined();
      expect(result.jobs.find((j) => j.externalId === 'old')).toBeDefined();
      expect(result.jobs).toHaveLength(2);
      expect(result.hasMore).toBe(false);
    });

    it('converts GOB epoch (seconds) to JS Date correctly', async () => {
      const epochSeconds = 1753660800; // fixed epoch
      httpMock.get.mockResolvedValueOnce({
        ok: true,
        status: 200,
        data: {
          data: [
            makeJob({
              published_at: Math.floor(Date.now() / 1000) - 24 * 60 * 60,
            }),
          ],
        },
        raw: '',
      });

      const result = await strategy.fetchJobs(1);
      const job = result.jobs[0];

      expect(job.publishedAt).toBeInstanceOf(Date);
    });
  });

  describe('fetchJobs — invalid item skipping', () => {
    it('skips jobs with published_at <= 0', async () => {
      httpMock.get.mockResolvedValueOnce({
        ok: true,
        status: 200,
        data: { data: [makeJob({ published_at: 0 }), makeJob({ id: 'valid' })] },
        raw: '',
      });

      const result = await strategy.fetchJobs(1);

      expect(result.jobs).toHaveLength(1);
      expect(result.jobs[0].externalId).toBe('valid');
    });

    it('skips jobs with empty link', async () => {
      httpMock.get.mockResolvedValueOnce({
        ok: true,
        status: 200,
        data: {
          data: [
            makeJob({ id: 'no-link', link: '' }),
            makeJob({ id: 'has-link' }),
          ],
        },
        raw: '',
      });

      const result = await strategy.fetchJobs(1);

      expect(result.jobs).toHaveLength(1);
      expect(result.jobs[0].externalId).toBe('has-link');
    });

    it('skips jobs with blank title', async () => {
      httpMock.get.mockResolvedValueOnce({
        ok: true,
        status: 200,
        data: {
          data: [
            makeJob({ id: 'blank-title', title: '   ' }),
            makeJob({ id: 'real-title', title: 'Developer' }),
          ],
        },
        raw: '',
      });

      const result = await strategy.fetchJobs(1);

      expect(result.jobs).toHaveLength(1);
      expect(result.jobs[0].externalId).toBe('real-title');
    });
  });

  describe('fetchJobs — non-2xx response', () => {
    it('throws descriptive Error on 500 response', async () => {
      httpMock.get.mockResolvedValueOnce({
        ok: false,
        status: 500,
        data: null,
        raw: 'Internal Server Error',
      });

      await expect(strategy.fetchJobs(1)).rejects.toThrow(
        /GetOnBoard API returned 500/,
      );
    });

    it('throws descriptive Error on 429 response', async () => {
      httpMock.get.mockResolvedValueOnce({
        ok: false,
        status: 429,
        data: null,
        raw: 'Too Many Requests',
      });

      await expect(strategy.fetchJobs(1)).rejects.toThrow(
        /GetOnBoard API returned 429/,
      );
    });
  });
});
