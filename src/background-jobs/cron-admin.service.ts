import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { DiscoveryService } from '@nestjs/core';
import { SchedulerRegistry } from '@nestjs/schedule';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BaseCronService } from './base-cron.service';

@Injectable()
export class CronAdminService {
  private readonly logger = new Logger(CronAdminService.name);
  private crons: BaseCronService[] = [];

  constructor(
    private readonly discoveryService: DiscoveryService,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly prisma: PrismaService,
  ) {}

  onApplicationBootstrap(): void {
    this.crons = this.discoveryService
      .getProviders()
      .filter((w) => w.instance != null && w.instance instanceof BaseCronService)
      .map((w) => w.instance as BaseCronService);

    this.logger.log(
      `Cron services discovered: ${this.crons.length} (${this.crons.map((c) => c.constructor.name).join(', ')})`,
    );
  }

  async triggerJob(jobName: string): Promise<{ message: string; jobName: string }> {
    const owner = this.crons.find((service) => service.hasJob(jobName));
    if (!owner) throw new NotFoundException(`Job "${jobName}" no encontrado`);

    owner.triggerManually(jobName).catch(() => {});

    return { message: 'Job iniciado en background', jobName };
  }

  async restartJob(key: string): Promise<{ message: string; key: string; schedule: string }> {
    const cronJob = await this.prisma.cronJob.findUnique({ where: { key } });
    if (!cronJob) {
      throw new NotFoundException(`Job "${key}" not found in cron_jobs table`);
    }
    if (!cronJob.active) {
      throw new BadRequestException(`Job "${key}" is inactive — activate it first`);
    }

    const owner = this.crons.find((service) => service.hasJob(key));
    if (!owner) {
      throw new NotFoundException(`Job "${key}" not registered in any service`);
    }

    try {
      this.schedulerRegistry.deleteCronJob(key);
    } catch {
      // job may not be running — ignore
    }

    await owner.restartJob(key, cronJob.schedule);

    return {
      message: `Job "${key}" reiniciado con schedule "${cronJob.schedule}"`,
      key,
      schedule: cronJob.schedule,
    };
  }

  async getCronJobs(onlyActive?: boolean) {
    return this.prisma.cronJob.findMany({
      where: onlyActive ? { active: true } : undefined,
      orderBy: { key: 'asc' },
    });
  }

  getRunningCronJobs() {
    const jobs = this.schedulerRegistry.getCronJobs();
    return Array.from(jobs.entries()).map(([key, job]) => ({
      key,
      running: true,
      nextRun: job.nextDate(),
    }));
  }

  async updateCronJob(id: string, data: Prisma.CronJobUpdateInput) {
    return this.prisma.cronJob.update({ where: { id }, data });
  }

  async getJobExecutions(filters: { page: number; sizePage: number; jobName?: string }) {
    const where = filters.jobName ? { jobName: filters.jobName } : {};
    const [data, total] = await Promise.all([
      this.prisma.jobExecution.findMany({
        where,
        orderBy: { startedAt: 'desc' },
        skip: (filters.page - 1) * filters.sizePage,
        take: filters.sizePage,
      }),
      this.prisma.jobExecution.count({ where }),
    ]);

    return {
      data,
      total,
      page: filters.page,
      sizePage: filters.sizePage,
    };
  }
}
