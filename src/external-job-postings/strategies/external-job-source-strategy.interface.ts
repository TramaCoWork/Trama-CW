import type { Prisma } from '@prisma/client';

export const EXTERNAL_JOB_SOURCE_STRATEGIES = Symbol(
  'EXTERNAL_JOB_SOURCE_STRATEGIES',
);

/** Normalised job data returned by each source strategy. */
export type ExternalJobDto = {
  externalId: string | null;
  title: string;
  link: string;
  categoryName: string | null;
  publishedAt: Date;
  /** Full raw payload from the source — stored as-is in the `raw` JSONB column. */
  raw: Prisma.InputJsonValue;
};

/** Batch result for a single page fetch. */
export type ExternalJobBatch = {
  jobs: ExternalJobDto[];
  /** True when the source has more pages to fetch. */
  hasMore: boolean;
};

/**
 * Contract for external job source adapters.
 *
 * Each strategy is responsible for fetching one page of jobs from its source
 * and returning a normalised batch. Pagination is driven by the CronService,
 * which calls `fetchJobs(page)` incrementally until `hasMore === false`.
 */
export interface ExternalJobSourceStrategy {
  /** Identifier stored in the `source` DB column (e.g. "getonboard"). */
  readonly source: string;

  /**
   * Fetch a single page of jobs (1-based).
   * Must throw a descriptive Error on non-2xx HTTP responses so the
   * CronService can catch, log, and continue with the next strategy.
   */
  fetchJobs(page: number): Promise<ExternalJobBatch>;
}
