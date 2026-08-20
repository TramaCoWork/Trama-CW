import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { BaseCronService, JobResult } from '../../background-jobs/base-cron.service';
import { EXTERNAL_JOB_SOURCE_STRATEGIES } from '../strategies/external-job-source-strategy.interface';
import type {
  ExternalJobSourceStrategy,
  ExternalJobDto,
} from '../strategies/external-job-source-strategy.interface';
import { ExternalJobPostingsBulkWriterService } from './external-job-postings-bulk-writer.service';

const JOB_KEY = 'externalJobPostingsSync';
// Fallback schedule if no cron_jobs DB row exists: every Monday at 3:00 AM UTC
const FALLBACK_SCHEDULE = '0 3 * * 1';

@Injectable()
export class ExternalJobPostingsCronService
  extends BaseCronService
  implements OnModuleInit
{
  protected readonly logger = new Logger(ExternalJobPostingsCronService.name);

  constructor(
    prisma: PrismaService,
    configService: ConfigService,
    schedulerRegistry: SchedulerRegistry,
    @Inject(EXTERNAL_JOB_SOURCE_STRATEGIES)
    private readonly strategies: ExternalJobSourceStrategy[],
    private readonly bulkWriter: ExternalJobPostingsBulkWriterService,
  ) {
    super(prisma, configService, schedulerRegistry);
  }

  async onModuleInit() {
    const schedules = await this.getCronSchedule();
    this.registerJob(
      JOB_KEY,
      schedules[JOB_KEY] ?? FALLBACK_SCHEDULE,
      () => this.handleSync(),
    );
  }

  async handleSync(): Promise<JobResult> {
    let totalProcessed = 0;
    const failedSources: string[] = [];

    for (const strategy of this.strategies) {
      const strategyJobs: ExternalJobDto[] = [];

      let page = 1;
      let hasMore = true;
      let strategyFailed = false;

      while (hasMore) {
        try {
          const batch = await strategy.fetchJobs(page);
          strategyJobs.push(...batch.jobs);
          hasMore = batch.hasMore;
          page++;
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          const stack = error instanceof Error ? (error.stack ?? '') : '';
          this.logger.error(
            `Strategy ${strategy.source} failed on page ${page}: ${msg}`,
            stack,
          );
          strategyFailed = true;
          hasMore = false;
        }
      }

      if (strategyFailed) {
        failedSources.push(strategy.source);
        // No partial data from the failed strategy is persisted
        continue;
      }

      const summary = await this.bulkWriter.upsertJobs(
        strategy.source,
        strategyJobs,
      );
      totalProcessed += summary.inserted + summary.updated;
    }

    // JobStatus.partial does not exist in the enum (verified step 3).
    // When strategies fail, we complete with an errorMessage listing the failures.
    // BaseCronService.runWithLogging handles status='completed' normally;
    // the errorMessage is surfaced via metadata so the operator can inspect it.
    let metadata: Prisma.InputJsonObject | undefined;
    if (failedSources.length > 0) {
      metadata = {
        failedSources,
        warning: `Las siguientes fuentes fallaron: ${failedSources.join(', ')}`,
      };
    }

    return {
      processedCount: totalProcessed,
      metadata,
    };
  }
}
