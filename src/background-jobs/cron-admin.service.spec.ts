import { BadRequestException, Logger, NotFoundException } from '@nestjs/common';
import { DiscoveryService } from '@nestjs/core';
import { SchedulerRegistry } from '@nestjs/schedule';
import { BaseCronService } from './base-cron.service';
import { CronAdminService } from './cron-admin.service';

// ─── Stub mínimo que pasa instanceof BaseCronService ─────────────────────────

class StubCronService extends BaseCronService {
  protected readonly logger = new Logger('StubCronService');

  constructor() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    super({} as any, {} as any, {} as any);
  }

  onModuleInit(): void {}
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeStub(jobNames: string[]): StubCronService {
  const stub = new StubCronService();
  jest.spyOn(stub, 'hasJob').mockImplementation((name) => jobNames.includes(name));
  jest.spyOn(stub, 'triggerManually').mockResolvedValue(undefined);
  jest.spyOn(stub, 'restartJob').mockResolvedValue(undefined);
  return stub;
}

function makeDiscovery(instances: BaseCronService[]): DiscoveryService {
  return {
    getProviders: jest.fn().mockReturnValue(
      instances.map((instance) => ({ instance })),
    ),
  } as unknown as DiscoveryService;
}

// ─── Suite ────────────────────────────────────────────────────────────────────

describe('CronAdminService', () => {
  let schedulerRegistry: jest.Mocked<Pick<SchedulerRegistry, 'deleteCronJob' | 'getCronJobs'>>;
  let prisma: {
    cronJob: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
    };
    jobExecution: {
      findMany: jest.Mock;
      count: jest.Mock;
    };
  };

  beforeEach(() => {
    schedulerRegistry = {
      deleteCronJob: jest.fn(),
      getCronJobs: jest.fn().mockReturnValue(new Map()),
    };

    prisma = {
      cronJob: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      jobExecution: {
        findMany: jest.fn(),
        count: jest.fn(),
      },
    };
  });

  function buildService(stubs: BaseCronService[]): CronAdminService {
    const svc = new CronAdminService(
      makeDiscovery(stubs),
      schedulerRegistry as unknown as SchedulerRegistry,
      prisma as any,
    );
    svc.onApplicationBootstrap();
    return svc;
  }

  // ─── triggerJob ─────────────────────────────────────────────────────────────

  describe('triggerJob', () => {
    it('llama triggerManually y devuelve mensaje cuando el job existe en el registry', async () => {
      const stub = makeStub(['dailyDigest', 'expiredTrials']);
      const svc = buildService([stub]);

      const result = await svc.triggerJob('dailyDigest');

      expect(stub.triggerManually).toHaveBeenCalledWith('dailyDigest');
      expect(result).toEqual({ message: 'Job iniciado en background', jobName: 'dailyDigest' });
    });

    it('lanza NotFoundException cuando ningún servicio tiene el job', async () => {
      const stub = makeStub(['expiredTrials']);
      const svc = buildService([stub]);

      await expect(svc.triggerJob('nonexistent')).rejects.toBeInstanceOf(NotFoundException);
      await expect(svc.triggerJob('nonexistent')).rejects.toMatchObject({
        message: 'Job "nonexistent" no encontrado',
      });
    });

    it('triggerJob dailyDigest funciona (regression: antes daba 404 por array hardcodeado asimétrico)', async () => {
      const stub = makeStub(['dailyDigest']);
      const svc = buildService([stub]);

      const result = await svc.triggerJob('dailyDigest');

      expect(result).toEqual({ message: 'Job iniciado en background', jobName: 'dailyDigest' });
    });

    it('triggerJob para communityDigestPush, onboardingReminder, subscriptionRenewPreapproval (antes invisibles)', async () => {
      const invisibleJobs = ['communityDigestPush', 'onboardingReminder', 'subscriptionRenewPreapproval'];
      const stub = makeStub(invisibleJobs);
      const svc = buildService([stub]);

      for (const jobName of invisibleJobs) {
        const result = await svc.triggerJob(jobName);
        expect(result).toEqual({ message: 'Job iniciado en background', jobName });
      }
      expect(stub.triggerManually).toHaveBeenCalledTimes(invisibleJobs.length);
    });
  });

  // ─── restartJob ─────────────────────────────────────────────────────────────

  describe('restartJob', () => {
    it('reinicia el job correctamente (happy path)', async () => {
      const key = 'expiredTrials';
      const schedule = '0 3 * * *';

      prisma.cronJob.findUnique.mockResolvedValue({ key, active: true, schedule });
      const stub = makeStub([key]);
      const svc = buildService([stub]);

      const result = await svc.restartJob(key);

      expect(schedulerRegistry.deleteCronJob).toHaveBeenCalledWith(key);
      expect(stub.restartJob).toHaveBeenCalledWith(key, schedule);
      expect(result).toEqual({
        message: `Job "${key}" reiniciado con schedule "${schedule}"`,
        key,
        schedule,
      });
    });

    it('lanza NotFoundException cuando el key no está en el registry de servicios', async () => {
      const key = 'expiredTrials';
      prisma.cronJob.findUnique.mockResolvedValue({ key, active: true, schedule: '0 3 * * *' });

      const stub = makeStub(['otherJob']); // no tiene 'expiredTrials'
      const svc = buildService([stub]);

      await expect(svc.restartJob(key)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('lanza NotFoundException cuando el cronJob no existe en DB', async () => {
      prisma.cronJob.findUnique.mockResolvedValue(null);
      const svc = buildService([]);

      await expect(svc.restartJob('inexistente')).rejects.toBeInstanceOf(NotFoundException);
    });

    it('lanza BadRequestException cuando el job está inactivo', async () => {
      const key = 'expiredTrials';
      prisma.cronJob.findUnique.mockResolvedValue({ key, active: false, schedule: '0 3 * * *' });
      const svc = buildService([makeStub([key])]);

      await expect(svc.restartJob(key)).rejects.toBeInstanceOf(BadRequestException);
    });

    it('absorbe el error de deleteCronJob sin fallar el restart', async () => {
      const key = 'expiredTrials';
      prisma.cronJob.findUnique.mockResolvedValue({ key, active: true, schedule: '0 3 * * *' });
      schedulerRegistry.deleteCronJob.mockImplementation(() => {
        throw new Error('job not registered');
      });
      const stub = makeStub([key]);
      const svc = buildService([stub]);

      // no debe lanzar a pesar del error en deleteCronJob
      await expect(svc.restartJob(key)).resolves.toMatchObject({ key });
    });
  });

  // ─── getCronJobs ─────────────────────────────────────────────────────────────

  describe('getCronJobs', () => {
    const rows = [
      { id: 'id-1', key: 'dailyDigest', name: 'Daily Digest', schedule: '0 7 * * *', active: true, createdAt: new Date(), updatedAt: new Date() },
      { id: 'id-2', key: 'expiredTrials', name: 'Expired Trials', schedule: '0 3 * * *', active: false, createdAt: new Date(), updatedAt: new Date() },
    ];

    it('devuelve todos los rows cuando no se filtra por active', async () => {
      prisma.cronJob.findMany.mockResolvedValue(rows);
      const svc = buildService([]);

      const result = await svc.getCronJobs();

      expect(prisma.cronJob.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: undefined }),
      );
      expect(result).toHaveLength(2);
    });

    it('filtra por active: true cuando onlyActive es true', async () => {
      prisma.cronJob.findMany.mockResolvedValue([rows[0]]);
      const svc = buildService([]);

      const result = await svc.getCronJobs(true);

      expect(prisma.cronJob.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { active: true } }),
      );
      expect(result).toHaveLength(1);
    });
  });
});
