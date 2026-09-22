import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PaymentProviderFactory } from './payment-provider.factory';

describe('PaymentProviderFactory', () => {
  const stripePaymentProvider = {} as any;
  let service: PaymentProviderFactory;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new PaymentProviderFactory(stripePaymentProvider);
  });

  it('should return the Stripe provider', () => {
    expect(service.get('stripe')).toBe(stripePaymentProvider);
  });

  it('should reject unsupported providers', () => {
    expect(() => service.get('paypal')).toThrow(
      'Unsupported payment provider: paypal',
    );
  });
});
