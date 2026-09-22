import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PendingCheckoutCleanupService } from './pending-checkout-cleanup.service';

describe('PendingCheckoutCleanupService', () => {
  let service: PendingCheckoutCleanupService;

  const ordersRepository = { findExpiredPending: vi.fn() };
  const ordersService = { cancelExpiredCheckout: vi.fn() };
  const paymentsRepository = { findByOrderId: vi.fn() };
  const stripePaymentProvider = { cancelPayment: vi.fn() };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new PendingCheckoutCleanupService(
      ordersRepository as any,
      ordersService as any,
      paymentsRepository as any,
      stripePaymentProvider as any,
    );
  });

  it('should do nothing when there are no expired orders', async () => {
    ordersRepository.findExpiredPending.mockResolvedValue([]);
    await service.handleExpiredCheckouts();
    expect(paymentsRepository.findByOrderId).not.toHaveBeenCalled();
  });

  it('should skip orders without a pending payment', async () => {
    ordersRepository.findExpiredPending.mockResolvedValue([{ id: 1 }]);
    paymentsRepository.findByOrderId.mockResolvedValue(null);

    await service.handleExpiredCheckouts();

    expect(stripePaymentProvider.cancelPayment).not.toHaveBeenCalled();
    expect(ordersService.cancelExpiredCheckout).not.toHaveBeenCalled();
  });

  it('should skip orders whose payment is not pending', async () => {
    ordersRepository.findExpiredPending.mockResolvedValue([{ id: 1 }]);
    paymentsRepository.findByOrderId.mockResolvedValue({
      id: 10,
      status: 'succeeded',
      providerPaymentId: 'pi_1',
    });

    await service.handleExpiredCheckouts();

    expect(stripePaymentProvider.cancelPayment).not.toHaveBeenCalled();
    expect(ordersService.cancelExpiredCheckout).not.toHaveBeenCalled();
  });

  it('should skip the order when Stripe does not return canceled', async () => {
    ordersRepository.findExpiredPending.mockResolvedValue([{ id: 1 }]);
    paymentsRepository.findByOrderId.mockResolvedValue({
      id: 10,
      status: 'pending',
      providerPaymentId: 'pi_1',
    });
    stripePaymentProvider.cancelPayment.mockResolvedValue({
      status: 'requires_payment_method',
    });

    await service.handleExpiredCheckouts();

    expect(stripePaymentProvider.cancelPayment).toHaveBeenCalledWith('pi_1');
    expect(ordersService.cancelExpiredCheckout).not.toHaveBeenCalled();
  });

  it('should cancel the checkout after Stripe confirms cancellation', async () => {
    ordersRepository.findExpiredPending.mockResolvedValue([{ id: 1 }]);
    paymentsRepository.findByOrderId.mockResolvedValue({
      id: 10,
      status: 'pending',
      providerPaymentId: 'pi_1',
    });
    stripePaymentProvider.cancelPayment.mockResolvedValue({
      status: 'canceled',
    });

    await service.handleExpiredCheckouts();

    expect(ordersService.cancelExpiredCheckout).toHaveBeenCalledWith(1);
  });

  it('should continue processing when one order fails', async () => {
    ordersRepository.findExpiredPending.mockResolvedValue([{ id: 1 }, { id: 2 }]);
    paymentsRepository.findByOrderId
      .mockResolvedValueOnce({
        status: 'pending',
        providerPaymentId: 'pi_1',
      })
      .mockResolvedValueOnce({
        status: 'pending',
        providerPaymentId: 'pi_2',
      });
    stripePaymentProvider.cancelPayment
      .mockRejectedValueOnce(new Error('Stripe error'))
      .mockResolvedValueOnce({ status: 'canceled' });

    await expect(service.handleExpiredCheckouts()).resolves.toBeUndefined();

    expect(ordersService.cancelExpiredCheckout).toHaveBeenCalledTimes(1);
    expect(ordersService.cancelExpiredCheckout).toHaveBeenCalledWith(2);
  });

  it('should continue when an unexpected non-Error is thrown', async () => {
    ordersRepository.findExpiredPending.mockResolvedValue([{ id: 1 }]);
    paymentsRepository.findByOrderId.mockResolvedValue({
      status: 'pending',
      providerPaymentId: 'pi_1',
    });
    stripePaymentProvider.cancelPayment.mockRejectedValue('stripe failure');

    await expect(service.handleExpiredCheckouts()).resolves.toBeUndefined();
    expect(ordersService.cancelExpiredCheckout).not.toHaveBeenCalled();
  });
});
