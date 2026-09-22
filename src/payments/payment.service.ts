import { Injectable } from '@nestjs/common';

import { PaymentProviderFactory } from './payment-provider.factory';

@Injectable()
export class PaymentService {
  constructor(
    private readonly paymentProviderFactory: PaymentProviderFactory,
  ) {}

  constructWebhookEvent(
    provider: string,
    payload: Buffer,
    signature: string,
    webhookSecret: string,
  ) {
    const paymentProvider = this.paymentProviderFactory.get(provider);

    return paymentProvider.constructWebhookEvent(
      payload,
      signature,
      webhookSecret,
    );
  }

  async createPayment(
    provider: string,
    amount: number,
    currency: string,
    metadata: Record<string, string>,
  ) {
    const paymentProvider = this.paymentProviderFactory.get(provider);

    return paymentProvider.createPayment({ amount, currency, metadata });
  }
}
