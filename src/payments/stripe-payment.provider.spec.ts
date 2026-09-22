import { beforeEach, describe, expect, it, vi } from 'vitest';

const stripeMock = vi.hoisted(() => ({
  constructEvent: vi.fn(),
  create: vi.fn(),
  cancel: vi.fn(),
}));

vi.mock('stripe', () => ({
  default: class Stripe {
    webhooks = { constructEvent: stripeMock.constructEvent };
    paymentIntents = {
      create: stripeMock.create,
      cancel: stripeMock.cancel,
    };
    constructor() {}
  },
}));

import { StripePaymentProvider } from './stripe-payment.provider';

describe('StripePaymentProvider', () => {
  let provider: StripePaymentProvider;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.STRIPE_SECRET_KEY = 'sk_test_123';
    provider = new StripePaymentProvider();
  });

  it('should throw when the Stripe secret key is missing', () => {
    delete process.env.STRIPE_SECRET_KEY;
    expect(() => new StripePaymentProvider()).toThrow(
      'STRIPE_SECRET_KEY is not configured.',
    );
  });

  it('should construct webhook events through Stripe', () => {
    const payload = Buffer.from('payload');
    const event = { id: 'evt_123', type: 'payment_intent.succeeded' };
    stripeMock.constructEvent.mockReturnValue(event);

    expect(
      provider.constructWebhookEvent(payload, 'signature', 'secret'),
    ).toBe(event);

    expect(stripeMock.constructEvent).toHaveBeenCalledWith(
      payload,
      'signature',
      'secret',
    );
  });

  it('should create a payment intent and return its identifiers', async () => {
    stripeMock.create.mockResolvedValue({
      id: 'pi_123',
      client_secret: 'cs_123',
    });

    await expect(
      provider.createPayment({
        amount: 12999,
        currency: 'eur',
        metadata: { orderId: '1', userId: '2' },
      }),
    ).resolves.toEqual({
      providerPaymentId: 'pi_123',
      clientSecret: 'cs_123',
    });

    expect(stripeMock.create).toHaveBeenCalledWith({
      amount: 12999,
      currency: 'eur',
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never',
      },
      metadata: { orderId: '1', userId: '2' },
    });
  });

  it('should throw when Stripe does not return a client secret', async () => {
    stripeMock.create.mockResolvedValue({
      id: 'pi_123',
      client_secret: null,
    });

    await expect(
      provider.createPayment({
        amount: 1000,
        currency: 'eur',
        metadata: { orderId: '1' },
      }),
    ).rejects.toThrow(
      'Stripe PaymentIntent did not return a client secret.',
    );
  });

  it('should propagate Stripe create errors', async () => {
    const error = new Error('Stripe error');
    stripeMock.create.mockRejectedValue(error);

    await expect(
      provider.createPayment({
        amount: 1000,
        currency: 'eur',
        metadata: { orderId: '1' },
      }),
    ).rejects.toThrow(error);
  });

  it('should cancel a payment through Stripe', async () => {
    const paymentIntent = { id: 'pi_123', status: 'canceled' };
    stripeMock.cancel.mockResolvedValue(paymentIntent);

    await expect(provider.cancelPayment('pi_123')).resolves.toBe(paymentIntent);

    expect(stripeMock.cancel).toHaveBeenCalledWith('pi_123', {
      cancellation_reason: 'abandoned',
    });
  });

  it('should propagate Stripe cancellation errors', async () => {
    const error = new Error('Stripe error');
    stripeMock.cancel.mockRejectedValue(error);

    await expect(provider.cancelPayment('pi_123')).rejects.toThrow(error);
  });
});
