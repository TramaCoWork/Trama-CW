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

  abstract onModuleInit(): void;

  protected getCronSchedule(): Record<string, string | null> {
    const raw = this.configService.get<string>('CRON_SCHEDULE');
    if (!raw) return {};

    try {
      return JSON.parse(raw) as Record<string, string | null>;
    } catch {
      this.logger.warn(
        'CRON_SCHEDULE is not valid JSON — no jobs will be registered',
      );
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
        `Job "${jobName}" no registrado — falta la key en CRON_SCHEDULE`,
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

  protected async runWithLogging(
    jobName: string,
    handler: () => Promise<JobResult | void>,
  ): Promise<void> {
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
