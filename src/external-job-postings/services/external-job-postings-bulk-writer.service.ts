import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { ExternalJobDto } from '../strategies/external-job-source-strategy.interface';

export type UpsertSummary = {
  inserted: number;
  updated: number;
  skipped: number;
};

@Injectable()
export class ExternalJobPostingsBulkWriterService {
  private readonly logger = new Logger(ExternalJobPostingsBulkWriterService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Upserts a batch of jobs for a given source.
   *
   * Dedup key logic:
   *   - If externalId is not null → lookup by (source, externalId)
   *   - If externalId is null → lookup by (source, link)
   *
   * If the record exists (regardless of deletedAt), update all mutable fields
   * and clear deletedAt (resurrection). Otherwise insert a new row.
   */
  async upsertJobs(
    source: string,
    jobs: ExternalJobDto[],
  ): Promise<UpsertSummary> {
    let inserted = 0;
    let updated = 0;
    const skipped = 0;

    for (const job of jobs) {
      try {
        const existing = await this.findExisting(source, job);

        if (existing) {
          await this.prisma.externalJobPosting.update({
            where: { id: existing.id },
            data: {
              title: job.title,
              categoryName: job.categoryName,
              publishedAt: job.publishedAt,
              raw: job.raw,
              link: job.link,
              deletedAt: null,
            },
          });
          updated++;
        } else {
          await this.prisma.externalJobPosting.create({
            data: {
              source,
              externalId: job.externalId,
              title: job.title,
              link: job.link,
              categoryName: job.categoryName,
              publishedAt: job.publishedAt,
              raw: job.raw,
            },
          });
          inserted++;
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        this.logger.error(
          `Error upserting job (source=${source}, externalId=${job.externalId}, link=${job.link}): ${msg}`,
        );
      }
    }

    this.logger.log(
      `Upsert complete for source=${source}: inserted=${inserted}, updated=${updated}, skipped=${skipped}`,
    );

    return { inserted, updated, skipped };
  }

  private async findExisting(source: string, job: ExternalJobDto) {
    if (job.externalId !== null) {
      return this.prisma.externalJobPosting.findFirst({
        where: { source, externalId: job.externalId },
        select: { id: true },
      });
    }

    return this.prisma.externalJobPosting.findFirst({
      where: { source, link: job.link },
      select: { id: true },
    });
  }
}
