import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { HttpClientService } from '../../common/http/http-client.service';
import type {
  ExternalJobSourceStrategy,
  ExternalJobBatch,
  ExternalJobDto,
} from './external-job-source-strategy.interface';

const GOB_API_URL = 'https://www.getonbrd.com/api/v0/search/jobs';
const GOB_PER_PAGE = 120;
const WINDOW_DAYS = 7;

type GobJob = {
  id: string | number;
  title?: string;
  published_at?: number;
  link?: string;
  category_name?: string;
  [key: string]: unknown;
};

type GobApiResponse = {
  data?: GobJob[];
  meta?: { total_count?: number };
};

@Injectable()
export class GetOnBoardStrategy implements ExternalJobSourceStrategy {
  readonly source = 'getonboard';

  private readonly logger = new Logger(GetOnBoardStrategy.name);

  constructor(private readonly http: HttpClientService) {}

  async fetchJobs(page: number): Promise<ExternalJobBatch> {
    const response = await this.http.get<GobApiResponse>(GOB_API_URL, {
      query: { per_page: GOB_PER_PAGE, page },
    });

    if (!response.ok) {
      throw new Error(
        `GetOnBoard API returned ${response.status} on page ${page}: ${response.raw.slice(0, 200)}`,
      );
    }

    const rawJobs = response.data?.data ?? [];
    const cutoff = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000);
    const jobs: ExternalJobDto[] = [];
    let skipped = 0;
    let oldestInWindow = true;

    for (const item of rawJobs) {
      const epoch = item.published_at ?? 0;
      const publishedAt = new Date(epoch * 1000);

      if (epoch <= 0) {
        skipped++;
        this.logger.warn(
          `[GOB page ${page}] Skipped job id=${item.id}: invalid published_at=${epoch}`,
        );
        continue;
      }

      if (!item.link) {
        skipped++;
        this.logger.warn(
          `[GOB page ${page}] Skipped job id=${item.id}: empty link`,
        );
        continue;
      }

      const title = (item.title ?? '').trim();
      if (!title) {
        skipped++;
        this.logger.warn(
          `[GOB page ${page}] Skipped job id=${item.id}: blank title`,
        );
        continue;
      }

      if (publishedAt < cutoff) {
        // Once we hit a job outside the window, pagination should stop.
        oldestInWindow = false;
        break;
      }

      jobs.push({
        externalId: String(item.id),
        title,
        link: item.link,
        categoryName: item.category_name ?? null,
        publishedAt,
        raw: item as unknown as Prisma.InputJsonObject,
      });
    }

    if (skipped > 0) {
      this.logger.warn(`[GOB page ${page}] Total skipped items: ${skipped}`);
    }

    // hasMore: there are more pages only if the current page was full
    // AND all jobs were within the window.
    const hasMore = rawJobs.length === GOB_PER_PAGE && oldestInWindow;

    return { jobs, hasMore };
  }
}
