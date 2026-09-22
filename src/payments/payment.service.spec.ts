import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PaymentService } from './payment.service';

describe('PaymentService', () => {
  let service: PaymentService;

  const paymentProviderFactory = {
    get: vi.fn(),
  };

  const paymentProvider = {
    constructWebhookEvent: vi.fn(),
    createPayment: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    service = new PaymentService(
      paymentProviderFactory as any,
    );
  });

  describe('constructWebhookEvent', () => {
    it('should get the provider and construct the webhook event', async () => {
      const payload = Buffer.from('webhook payload');
      const signature = 'signature';
      const webhookSecret = 'webhook-secret';

      const webhookEvent = {
        id: 'evt_123',
        type: 'payment.succeeded',
      };

      paymentProviderFactory.get.mockReturnValue(
        paymentProvider,
      );
      paymentProvider.constructWebhookEvent.mockResolvedValue(
        webhookEvent,
      );

      const result = await service.constructWebhookEvent(
        'stripe',
        payload,
        signature,
        webhookSecret,
      );

      expect(result).toEqual(webhookEvent);

      expect(paymentProviderFactory.get).toHaveBeenCalledOnce();
      expect(paymentProviderFactory.get).toHaveBeenCalledWith(
        'stripe',
      );

      expect(
        paymentProvider.constructWebhookEvent,
      ).toHaveBeenCalledOnce();
      expect(
        paymentProvider.constructWebhookEvent,
      ).toHaveBeenCalledWith(
        payload,
        signature,
        webhookSecret,
      );
    });

    it('should propagate errors thrown by the provider factory', () => {
      const error = new Error('Unsupported payment provider');

      paymentProviderFactory.get.mockImplementation(() => {
        throw error;
      });

      expect(() =>
        service.constructWebhookEvent(
          'unknown',
          Buffer.from('payload'),
          'signature',
          'secret',
        ),
      ).toThrow(error);

      expect(paymentProviderFactory.get).toHaveBeenCalledOnce();
      expect(paymentProvider.constructWebhookEvent).not.toHaveBeenCalled();
    });

    it('should propagate errors thrown while constructing the webhook event', async () => {
      const error = new Error('Invalid webhook signature');

      paymentProviderFactory.get.mockReturnValue(
        paymentProvider,
      );
      paymentProvider.constructWebhookEvent.mockRejectedValue(
        error,
      );

      await expect(
        service.constructWebhookEvent(
          'stripe',
          Buffer.from('payload'),
          'signature',
          'secret',
        ),
      ).rejects.toThrow(error);

      expect(paymentProviderFactory.get).toHaveBeenCalledWith(
        'stripe',
      );
      expect(
        paymentProvider.constructWebhookEvent,
      ).toHaveBeenCalledWith(
        expect.any(Buffer),
        'signature',
        'secret',
      );
    });
  });

  describe('createPayment', () => {
    it('should get the provider and create the payment', async () => {
      const metadata = {
        orderId: '123',
        userId: '456',
      };

      const payment = {
        providerPaymentId: 'pi_123',
        clientSecret: 'secret_123',
      };

      paymentProviderFactory.get.mockReturnValue(
        paymentProvider,
      );
      paymentProvider.createPayment.mockResolvedValue(payment);

      const result = await service.createPayment(
        'stripe',
        12999,
        'eur',
        metadata,
      );

      expect(result).toEqual(payment);

      expect(paymentProviderFactory.get).toHaveBeenCalledOnce();
      expect(paymentProviderFactory.get).toHaveBeenCalledWith(
        'stripe',
      );

      expect(
        paymentProvider.createPayment,
      ).toHaveBeenCalledOnce();
      expect(
        paymentProvider.createPayment,
      ).toHaveBeenCalledWith({
        amount: 12999,
        currency: 'eur',
        metadata,
      });
    });

    it('should pass the metadata object unchanged to the provider', async () => {
      const metadata = {
        orderId: '789',
        userId: '10',
        source: 'checkout',
      };

      paymentProviderFactory.get.mockReturnValue(
        paymentProvider,
      );
      paymentProvider.createPayment.mockResolvedValue({
        providerPaymentId: 'pi_456',
        clientSecret: 'secret_456',
      });

      await service.createPayment(
        'stripe',
        5000,
        'usd',
        metadata,
      );

      expect(
        paymentProvider.createPayment,
      ).toHaveBeenCalledWith({
        amount: 5000,
        currency: 'usd',
        metadata,
      });
    });

    it('should propagate errors thrown by the provider factory', async () => {
      const error = new Error('Unsupported payment provider');

      paymentProviderFactory.get.mockImplementation(() => {
        throw error;
      });

      await expect(
        service.createPayment(
          'unknown',
          1000,
          'eur',
          { orderId: '1' },
        ),
      ).rejects.toThrow(error);

      expect(paymentProviderFactory.get).toHaveBeenCalledOnce();
      expect(paymentProvider.createPayment).not.toHaveBeenCalled();
    });

    it('should propagate errors thrown while creating the payment', async () => {
      const error = new Error('Payment provider error');

      paymentProviderFactory.get.mockReturnValue(
        paymentProvider,
      );
      paymentProvider.createPayment.mockRejectedValue(error);

      await expect(
        service.createPayment(
          'stripe',
          1000,
          'eur',
          { orderId: '1' },
        ),
      ).rejects.toThrow(error);

      expect(paymentProviderFactory.get).toHaveBeenCalledWith(
        'stripe',
      );
      expect(
        paymentProvider.createPayment,
      ).toHaveBeenCalledWith({
        amount: 1000,
        currency: 'eur',
        metadata: { orderId: '1' },
      });
    });
  });
});
