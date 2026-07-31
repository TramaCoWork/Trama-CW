import { SubscriptionsCronService } from './subscriptions-cron.service';

describe('SubscriptionsCronService.cancelStalePending', () => {
  const prisma = {
    subscription: { findMany: jest.fn(), updateMany: jest.fn() },
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
    prisma.subscription.findMany.mockResolvedValue([
      { id: 's-1', userId: 'u-1' },
      { id: 's-2', userId: 'u-2' },
      { id: 's-3', userId: 'u-1' }, // mismo user, para probar dedupe
    ]);
    prisma.subscription.updateMany.mockResolvedValue({ count: 3 });
  });

  it('cancela pendientes con link y updatedAt anterior al umbral (default 2 dias)', async () => {
    const res = await service.cancelStalePending();

    const findCall = prisma.subscription.findMany.mock.calls[0][0];
    expect(findCall.where.status).toBe('pending');
    expect(findCall.where.initPoint).toEqual({ not: null });
    expect(findCall.where.updatedAt.lt).toBeInstanceOf(Date);

    const updateCall = prisma.subscription.updateMany.mock.calls[0][0];
    expect(updateCall.where.id).toEqual({ in: ['s-1', 's-2', 's-3'] });
    expect(updateCall.data.status).toBe('cancelled');
    expect(updateCall.data.cancellationReason).toContain('2 dias');

    expect(res.count).toBe(3);
    // userIds deduplicados
    expect(res.userIds).toEqual(['u-1', 'u-2']);
  });

  it('respeta PENDING_SUBSCRIPTION_MAX_AGE_DAYS configurable', async () => {
    config.get.mockReturnValue(5);

    const before = Date.now() - 5 * 24 * 60 * 60 * 1000;
    await service.cancelStalePending();
    const after = Date.now() - 5 * 24 * 60 * 60 * 1000;

    const threshold: Date =
      prisma.subscription.findMany.mock.calls[0][0].where.updatedAt.lt;
    expect(threshold.getTime()).toBeGreaterThanOrEqual(before - 1000);
    expect(threshold.getTime()).toBeLessThanOrEqual(after + 1000);
  });

  it('no hace update ni devuelve userIds si no hay pendientes viejos', async () => {
    prisma.subscription.findMany.mockResolvedValue([]);

    const res = await service.cancelStalePending();

    expect(prisma.subscription.updateMany).not.toHaveBeenCalled();
    expect(res).toEqual({ count: 0, userIds: [] });
  });
});
