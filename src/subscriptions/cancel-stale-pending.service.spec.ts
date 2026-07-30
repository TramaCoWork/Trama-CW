import { SubscriptionsCronService } from './subscriptions-cron.service';

describe('SubscriptionsCronService.cancelStalePending', () => {
  const prisma = {
    subscription: { updateMany: jest.fn() },
  };
  const config = {
    get: jest.fn((_k: string, d: unknown) => d),
  };

  let service: SubscriptionsCronService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SubscriptionsCronService(
      prisma as any,
      config as any,
      {} as any,
      {} as any,
    );
    prisma.subscription.updateMany.mockResolvedValue({ count: 3 });
  });

  it('cancela pendientes con link y updatedAt anterior al umbral (default 2 dias)', async () => {
    const res = await service.cancelStalePending();

    const call = prisma.subscription.updateMany.mock.calls[0][0];
    expect(call.where.status).toBe('pending');
    expect(call.where.initPoint).toEqual({ not: null });
    expect(call.where.updatedAt.lt).toBeInstanceOf(Date);
    expect(call.data.status).toBe('cancelled');
    expect(call.data.cancellationReason).toContain('2 dias');
    expect(res).toBe(3);
  });

  it('respeta PENDING_SUBSCRIPTION_MAX_AGE_DAYS configurable', async () => {
    config.get.mockReturnValue(5);

    const before = Date.now() - 5 * 24 * 60 * 60 * 1000;
    await service.cancelStalePending();
    const after = Date.now() - 5 * 24 * 60 * 60 * 1000;

    const threshold: Date = prisma.subscription.updateMany.mock.calls[0][0].where
      .updatedAt.lt;
    // el umbral es ~ ahora - 5 dias
    expect(threshold.getTime()).toBeGreaterThanOrEqual(before - 1000);
    expect(threshold.getTime()).toBeLessThanOrEqual(after + 1000);
  });

  it('devuelve 0 si no hay pendientes viejos', async () => {
    prisma.subscription.updateMany.mockResolvedValue({ count: 0 });
    await expect(service.cancelStalePending()).resolves.toBe(0);
  });
});
