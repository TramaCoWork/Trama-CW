import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface JobResult {
  processedCount?: number;
  metadata?: Prisma.InputJsonObject;
}

@Injectable()
export abstract class BaseCronService implements OnModuleInit {
  protected abstract readonly logger: Logger;
  private readonly jobHandlers = new Map<string, () => Promise<JobResult | void>>();

  constructor(
    protected readonly prisma: PrismaService,
    protected readonly configService: ConfigService,
    protected readonly schedulerRegistry: SchedulerRegistry,
  ) {}

  abstract onModuleInit(): void | Promise<void>;

  protected async getCronSchedule(): Promise<Record<string, string | null>> {
    try {
      const jobs = await this.prisma.cronJob.findMany({
        where: { active: true },
        select: { key: true, schedule: true },
      });
      return Object.fromEntries(jobs.map((j) => [j.key, j.schedule]));
    } catch {
      this.logger.warn('Could not read cron_jobs from DB');
      return {};
    }
  }

  protected registerJob(
    jobName: string,
    schedule: string | null | undefined,
    handler: () => Promise<JobResult | void>,
  ): void {
    this.jobHandlers.set(jobName, handler);

    if (typeof schedule !== 'string') {
      this.logger.warn(
        `Job "${jobName}" no registrado — falta la key en cron_jobs`,
      );
      return;
    }

    const job = new CronJob(schedule, () =>
      this.runWithLogging(jobName, handler),
    );
    this.schedulerRegistry.addCronJob(jobName, job);
    job.start();
    this.logger.log(`Job ${jobName} registrado con schedule: ${schedule}`);
  }

  hasJob(jobName: string): boolean {
    return this.jobHandlers.has(jobName);
  }

  async triggerManually(jobName: string): Promise<void> {
    const handler = this.jobHandlers.get(jobName);
    if (!handler) {
      throw new NotFoundException(
        `Job "${jobName}" no encontrado en este servicio`,
      );
    }

    await this.runWithLogging(jobName, handler);
  }

  async restartJob(jobName: string, schedule: string): Promise<void> {
    const handler = this.jobHandlers.get(jobName);
    if (!handler) {
      throw new NotFoundException(`Handler for job "${jobName}" not found`);
    }

    const job = new CronJob(schedule, () =>
      this.runWithLogging(jobName, handler),
    );
    this.schedulerRegistry.addCronJob(jobName, job);
    job.start();
    this.logger.log(`Job "${jobName}" reiniciado con schedule: ${schedule}`);
  }

  protected async runWithLogging(
    jobName: string,
    handler: () => Promise<JobResult | void>,
  ): Promise<void> {
    try {
      const jobConfig = await this.prisma.cronJob.findUnique({
        where: { key: jobName },
        select: { active: true },
      });

      if (jobConfig && !jobConfig.active) {
        this.logger.log(`Job "${jobName}" skipped — marked as inactive in DB`);
        return;
      }
    } catch {
      this.logger.warn(
        `Could not verify active status for job "${jobName}" — proceeding`,
      );
    }

    const startedAt = new Date();
    const execution = await this.prisma.jobExecution.create({
      data: { jobName, status: 'running', startedAt },
    });

    try {
      this.logger.log(`Iniciando ${jobName}...`);
      const result = await handler();
      const finishedAt = new Date();
      const durationMs = finishedAt.getTime() - startedAt.getTime();

      await this.prisma.jobExecution.update({
        where: { id: execution.id },
        data: {
          status: 'completed',
          finishedAt,
          durationMs,
          processedCount: result?.processedCount ?? null,
          ...(result?.metadata !== undefined
            ? { metadata: result.metadata }
            : {}),
        },
      });
      this.logger.log(
        `Finalizado ${jobName} (duración: ${durationMs}ms, procesados: ${result?.processedCount ?? 0})`,
      );
    } catch (error) {
      const finishedAt = new Date();
      const durationMs = finishedAt.getTime() - startedAt.getTime();
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      const errorStack = error instanceof Error ? (error.stack ?? null) : null;

      await this.prisma.jobExecution.update({
        where: { id: execution.id },
        data: {
          status: 'failed',
          finishedAt,
          durationMs,
          errorMessage,
          errorStack,
        },
      });
      this.logger.error(
        `Error en ${jobName}: ${errorMessage}`,
        errorStack ?? undefined,
      );
    }
  }
}
