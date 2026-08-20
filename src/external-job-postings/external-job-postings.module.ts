import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ExternalJobPostingsController } from './controllers/external-job-postings.controller';
import { ExternalJobPostingsService } from './services/external-job-postings.service';
import { ExternalJobPostingsBulkWriterService } from './services/external-job-postings-bulk-writer.service';
import { ExternalJobPostingsCronService } from './services/external-job-postings-cron.service';
import { GetOnBoardStrategy } from './strategies/get-on-board.strategy';
import { EXTERNAL_JOB_SOURCE_STRATEGIES } from './strategies/external-job-source-strategy.interface';

@Module({
  imports: [PrismaModule],
  controllers: [ExternalJobPostingsController],
  providers: [
    ExternalJobPostingsService,
    ExternalJobPostingsBulkWriterService,
    ExternalJobPostingsCronService,
    GetOnBoardStrategy,
    {
      provide: EXTERNAL_JOB_SOURCE_STRATEGIES,
      useFactory: (gob: GetOnBoardStrategy) => [gob],
      inject: [GetOnBoardStrategy],
    },
  ],
  exports: [ExternalJobPostingsCronService],
})
export class ExternalJobPostingsModule {}
