import type {
  ExternalJobSourceStrategy,
  ExternalJobBatch,
} from './external-job-source-strategy.interface';

/**
 * Deterministic stub strategy used exclusively in tests.
 * NOT registered in the production DI registry.
 * Returns a fixed set of 2 jobs on page 1, hasMore=false on page 2+.
 */
export class StubJobSourceStrategy implements ExternalJobSourceStrategy {
  readonly source = 'stub';

  private readonly fixedJobs = [
    {
      externalId: 'stub-001',
      title: 'Senior TypeScript Developer',
      link: 'https://stub.example.com/jobs/1',
      categoryName: 'Programming',
      publishedAt: new Date('2026-08-18T12:00:00.000Z'),
      raw: { id: 'stub-001', title: 'Senior TypeScript Developer' },
    },
    {
      externalId: 'stub-002',
      title: 'Product Designer',
      link: 'https://stub.example.com/jobs/2',
      categoryName: 'Design',
      publishedAt: new Date('2026-08-17T09:00:00.000Z'),
      raw: { id: 'stub-002', title: 'Product Designer' },
    },
  ];

  fetchJobs(page: number): Promise<ExternalJobBatch> {
    if (page === 1) {
      return Promise.resolve({ jobs: this.fixedJobs, hasMore: false });
    }
    return Promise.resolve({ jobs: [], hasMore: false });
  }
}
