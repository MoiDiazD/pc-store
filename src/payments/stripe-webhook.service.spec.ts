import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { StripeWebhookService } from './stripe-webhook.service';

describe('StripeWebhookService', () => {
  let service: StripeWebhookService;

  const stripePaymentProvider = {
    constructWebhookEvent: vi.fn(),
  };

  const paymentsRepository = {
    findByProviderPaymentId: vi.fn(),
    updateStatus: vi.fn(),
  };

  const ordersRepository = {
    findById: vi.fn(),
    updateStatus: vi.fn(),
  };

  const cartRepository = {
    findByUserId: vi.fn(),
  };

  const cartItemsRepository = {
    removeByCartId: vi.fn(),
  };

  const db = {};

  const originalWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  beforeEach(() => {
    vi.clearAllMocks();

    if (originalWebhookSecret === undefined) {
      delete process.env.STRIPE_WEBHOOK_SECRET;
    } else {
      process.env.STRIPE_WEBHOOK_SECRET = originalWebhookSecret;
    }

    service = new StripeWebhookService(
      stripePaymentProvider as any,
      paymentsRepository as any,
      ordersRepository as any,
      cartRepository as any,
      cartItemsRepository as any,
      db as any,
    );
  });

  describe('handle', () => {
    it('should throw BadRequestException when the Stripe signature is missing', async () => {
      const payload = Buffer.from('payload');

      await expect(
        service.handle(payload),
      ).rejects.toThrow(
        new BadRequestException(
          'Missing Stripe signature.',
        ),
      );

      expect(
        stripePaymentProvider.constructWebhookEvent,
      ).not.toHaveBeenCalled();
    });

    it('should throw when STRIPE_WEBHOOK_SECRET is not configured', async () => {
      delete process.env.STRIPE_WEBHOOK_SECRET;

      await expect(
        service.handle(
          Buffer.from('payload'),
          'signature',
        ),
      ).rejects.toThrow(
        'STRIPE_WEBHOOK_SECRET is not configured.',
      );

      expect(
        stripePaymentProvider.constructWebhookEvent,
      ).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when the Stripe signature is invalid', async () => {
      process.env.STRIPE_WEBHOOK_SECRET = 'webhook-secret';

      const payload = Buffer.from('payload');
      const error = new Error('Invalid signature');

      stripePaymentProvider.constructWebhookEvent.mockImplementation(
        () => {
          throw error;
        },
      );

      await expect(
        service.handle(payload, 'invalid-signature'),
      ).rejects.toThrow(
        new BadRequestException(
          'Invalid Stripe webhook signature.',
        ),
      );

      expect(
        stripePaymentProvider.constructWebhookEvent,
      ).toHaveBeenCalledOnce();
      expect(
        stripePaymentProvider.constructWebhookEvent,
      ).toHaveBeenCalledWith(
        payload,
        'invalid-signature',
        'webhook-secret',
      );
    });

    it('should return received true for unsupported event types', async () => {
      process.env.STRIPE_WEBHOOK_SECRET = 'webhook-secret';

      const event = {
        type: 'payment_intent.created',
        data: {
          object: {},
        },
      };

      stripePaymentProvider.constructWebhookEvent.mockReturnValue(
        event,
      );

      const result = await service.handle(
        Buffer.from('payload'),
        'signature',
      );

      expect(result).toEqual({
        received: true,
      });

      expect(
        paymentsRepository.findByProviderPaymentId,
      ).not.toHaveBeenCalled();
      expect(
        ordersRepository.updateStatus,
      ).not.toHaveBeenCalled();
      expect(
        cartItemsRepository.removeByCartId,
      ).not.toHaveBeenCalled();
    });

    it('should handle a successful payment intent', async () => {
      process.env.STRIPE_WEBHOOK_SECRET = 'webhook-secret';

      const paymentIntent = {
        id: 'pi_123',
      };

      const event = {
        type: 'payment_intent.succeeded',
        data: {
          object: paymentIntent,
        },
      };

      const payment = {
        id: 10,
        orderId: 20,
        status: 'pending',
      };

      const order = {
        id: 20,
        userId: 30,
        status: 'pending',
      };

      const cart = {
        id: 40,
        userId: 30,
      };

      stripePaymentProvider.constructWebhookEvent.mockReturnValue(
        event,
      );
      paymentsRepository.findByProviderPaymentId.mockResolvedValue(
        payment,
      );
      ordersRepository.findById.mockResolvedValue(order);
      paymentsRepository.updateStatus.mockResolvedValue({
        ...payment,
        status: 'succeeded',
      });
      ordersRepository.updateStatus.mockResolvedValue(order);
      cartRepository.findByUserId.mockResolvedValue(cart);
      cartItemsRepository.removeByCartId.mockResolvedValue(
        undefined,
      );

      const result = await service.handle(
        Buffer.from('payload'),
        'signature',
      );

      expect(result).toEqual({
        received: true,
      });

      expect(
        paymentsRepository.findByProviderPaymentId,
      ).toHaveBeenCalledWith('stripe', paymentIntent.id);

      expect(
        ordersRepository.findById,
      ).toHaveBeenCalledWith(payment.orderId);

      expect(
        paymentsRepository.updateStatus,
      ).toHaveBeenCalledWith(
        payment.id,
        'succeeded',
      );

      expect(
        ordersRepository.updateStatus,
      ).toHaveBeenCalledWith(
        order.id,
        'confirmed',
      );

      expect(
        cartRepository.findByUserId,
      ).toHaveBeenCalledWith(order.userId);

      expect(
        cartItemsRepository.removeByCartId,
      ).toHaveBeenCalledWith(cart.id);
    });

    it('should throw NotFoundException when the payment does not exist', async () => {
      process.env.STRIPE_WEBHOOK_SECRET = 'webhook-secret';

      stripePaymentProvider.constructWebhookEvent.mockReturnValue({
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_missing',
          },
        },
      });

      paymentsRepository.findByProviderPaymentId.mockResolvedValue(
        null,
      );

      await expect(
        service.handle(
          Buffer.from('payload'),
          'signature',
        ),
      ).rejects.toThrow(
        new NotFoundException('Payment not found.'),
      );

      expect(
        ordersRepository.findById,
      ).not.toHaveBeenCalled();
      expect(
        paymentsRepository.updateStatus,
      ).not.toHaveBeenCalled();
    });

    it('should ignore a payment that is already succeeded', async () => {
      process.env.STRIPE_WEBHOOK_SECRET = 'webhook-secret';

      const payment = {
        id: 10,
        orderId: 20,
        status: 'succeeded',
      };

      stripePaymentProvider.constructWebhookEvent.mockReturnValue({
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_123',
          },
        },
      });

      paymentsRepository.findByProviderPaymentId.mockResolvedValue(
        payment,
      );

      const result = await service.handle(
        Buffer.from('payload'),
        'signature',
      );

      expect(result).toEqual({
        received: true,
      });

      expect(ordersRepository.findById).not.toHaveBeenCalled();
      expect(
        paymentsRepository.updateStatus,
      ).not.toHaveBeenCalled();
      expect(
        ordersRepository.updateStatus,
      ).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when the order does not exist', async () => {
      process.env.STRIPE_WEBHOOK_SECRET = 'webhook-secret';

      stripePaymentProvider.constructWebhookEvent.mockReturnValue({
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_123',
          },
        },
      });

      paymentsRepository.findByProviderPaymentId.mockResolvedValue({
        id: 10,
        orderId: 20,
        status: 'pending',
      });

      ordersRepository.findById.mockResolvedValue(null);

      await expect(
        service.handle(
          Buffer.from('payload'),
          'signature',
        ),
      ).rejects.toThrow(
        new NotFoundException('Order not found.'),
      );

      expect(
        paymentsRepository.updateStatus,
      ).not.toHaveBeenCalled();
      expect(
        ordersRepository.updateStatus,
      ).not.toHaveBeenCalled();
    });

    it('should ignore the payment when the order is not pending', async () => {
      process.env.STRIPE_WEBHOOK_SECRET = 'webhook-secret';

      const payment = {
        id: 10,
        orderId: 20,
        status: 'pending',
      };

      const order = {
        id: 20,
        userId: 30,
        status: 'confirmed',
      };

      stripePaymentProvider.constructWebhookEvent.mockReturnValue({
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_123',
          },
        },
      });

      paymentsRepository.findByProviderPaymentId.mockResolvedValue(
        payment,
      );
      ordersRepository.findById.mockResolvedValue(order);

      const result = await service.handle(
        Buffer.from('payload'),
        'signature',
      );

      expect(result).toEqual({
        received: true,
      });

      expect(
        paymentsRepository.updateStatus,
      ).not.toHaveBeenCalled();
      expect(
        ordersRepository.updateStatus,
      ).not.toHaveBeenCalled();
      expect(
        cartRepository.findByUserId,
      ).not.toHaveBeenCalled();
    });

    it('should stop when updating the payment does not return a payment', async () => {
      process.env.STRIPE_WEBHOOK_SECRET = 'webhook-secret';

      const payment = {
        id: 10,
        orderId: 20,
        status: 'pending',
      };

      const order = {
        id: 20,
        userId: 30,
        status: 'pending',
      };

      stripePaymentProvider.constructWebhookEvent.mockReturnValue({
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_123',
          },
        },
      });

      paymentsRepository.findByProviderPaymentId.mockResolvedValue(
        payment,
      );
      ordersRepository.findById.mockResolvedValue(order);
      paymentsRepository.updateStatus.mockResolvedValue(null);

      const result = await service.handle(
        Buffer.from('payload'),
        'signature',
      );

      expect(result).toEqual({
        received: true,
      });

      expect(
        paymentsRepository.updateStatus,
      ).toHaveBeenCalledWith(
        payment.id,
        'succeeded',
      );
      expect(
        ordersRepository.updateStatus,
      ).not.toHaveBeenCalled();
      expect(
        cartRepository.findByUserId,
      ).not.toHaveBeenCalled();
    });

    it('should confirm the order without removing cart items when the cart does not exist', async () => {
      process.env.STRIPE_WEBHOOK_SECRET = 'webhook-secret';

      const payment = {
        id: 10,
        orderId: 20,
        status: 'pending',
      };

      const order = {
        id: 20,
        userId: 30,
        status: 'pending',
      };

      stripePaymentProvider.constructWebhookEvent.mockReturnValue({
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_123',
          },
        },
      });

      paymentsRepository.findByProviderPaymentId.mockResolvedValue(
        payment,
      );
      ordersRepository.findById.mockResolvedValue(order);
      paymentsRepository.updateStatus.mockResolvedValue({
        ...payment,
        status: 'succeeded',
      });
      ordersRepository.updateStatus.mockResolvedValue(order);
      cartRepository.findByUserId.mockResolvedValue(null);

      const result = await service.handle(
        Buffer.from('payload'),
        'signature',
      );

      expect(result).toEqual({
        received: true,
      });

      expect(
        paymentsRepository.updateStatus,
      ).toHaveBeenCalledWith(
        payment.id,
        'succeeded',
      );
      expect(
        ordersRepository.updateStatus,
      ).toHaveBeenCalledWith(
        order.id,
        'confirmed',
      );
      expect(
        cartItemsRepository.removeByCartId,
      ).not.toHaveBeenCalled();
    });

    it('should propagate repository errors', async () => {
      process.env.STRIPE_WEBHOOK_SECRET = 'webhook-secret';

      const error = new Error('Database error');

      stripePaymentProvider.constructWebhookEvent.mockReturnValue({
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_123',
          },
        },
      });

      paymentsRepository.findByProviderPaymentId.mockRejectedValue(
        error,
      );

      await expect(
        service.handle(
          Buffer.from('payload'),
          'signature',
        ),
      ).rejects.toThrow(error);

      expect(
        paymentsRepository.findByProviderPaymentId,
      ).toHaveBeenCalledWith(
        'stripe',
        'pi_123',
      );
    });
  });
});
