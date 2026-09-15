import { Injectable } from '@nestjs/common';

import type { PaymentProvider } from './payment-provider.interface';
import { StripePaymentProvider } from './stripe-payment.provider';

@Injectable()
export class PaymentProviderFactory {
  constructor(
    private readonly stripePaymentProvider: StripePaymentProvider,
  ) {}

  get(provider: string): PaymentProvider {
    switch (provider) {
      case 'stripe':
        return this.stripePaymentProvider;

      default:
        throw new Error(`Unsupported payment provider: ${provider}`);
    }
  }
}