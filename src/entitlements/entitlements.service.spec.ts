import { SubscriptionStatus } from '@prisma/client';
import { EntitlementsService } from './entitlements.service';

describe('EntitlementsService', () => {
  const prisma = {
    professionalProfile: { findFirst: jest.fn() },
    subscription: { count: jest.fn() },
  };

  let service: EntitlementsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new EntitlementsService(prisma as any);
    prisma.professionalProfile.findFirst.mockResolvedValue({
      trialEndDate: null,
      profileStatus: 'waiting_payment',
    });
    prisma.subscription.count.mockResolvedValue(0);
  });

  describe('isPaid', () => {
    it('true con suscripcion activa', async () => {
      prisma.subscription.count.mockResolvedValue(1);
      await expect(service.isPaid('u-1')).resolves.toBe(true);
      expect(prisma.subscription.count).toHaveBeenCalledWith({
        where: { userId: 'u-1', status: SubscriptionStatus.active },
      });
    });

    it('true con trial vigente (sin suscripcion)', async () => {
      prisma.professionalProfile.findFirst.mockResolvedValue({
        trialEndDate: new Date(Date.now() + 86400000),
      });
      await expect(service.isPaid('u-1')).resolves.toBe(true);
      // no hace falta consultar suscripciones si el trial ya lo cubre
      expect(prisma.subscription.count).not.toHaveBeenCalled();
    });

    it('false sin suscripcion ni trial (free)', async () => {
      await expect(service.isPaid('u-1')).resolves.toBe(false);
    });
  });

  describe('getTier', () => {
    it('paid cuando isPaid', async () => {
      prisma.subscription.count.mockResolvedValue(1);
      await expect(service.getTier('u-1')).resolves.toBe('paid');
    });

    it('free por defecto', async () => {
      await expect(service.getTier('u-1')).resolves.toBe('free');
    });
  });

  describe('isValidated', () => {
    it('true si validatedAt seteado (admin valido)', async () => {
      prisma.professionalProfile.findFirst.mockResolvedValue({
        validatedAt: new Date(),
      });
      await expect(service.isValidated('u-1')).resolves.toBe(true);
    });

    it('false si validatedAt es null', async () => {
      prisma.professionalProfile.findFirst.mockResolvedValue({
        validatedAt: null,
      });
      await expect(service.isValidated('u-1')).resolves.toBe(false);
    });
  });
});
