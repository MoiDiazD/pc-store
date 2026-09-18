import { Injectable } from '@nestjs/common';
import Stripe from 'stripe';

import type {
  CreatePaymentParams,
  CreatePaymentResult,
  PaymentProvider,
} from './payment-provider.interface';

@Injectable()
export class StripePaymentProvider implements PaymentProvider {
  private readonly stripe: Stripe;

  constructor() {
    const secretKey = process.env.STRIPE_SECRET_KEY;

    if (!secretKey) {
      throw new Error('STRIPE_SECRET_KEY is not configured.');
    }

    this.stripe = new Stripe(secretKey);
  }

  
  constructWebhookEvent(
    payload: Buffer,
    signature: string,
    webhookSecret: string,
    ): Stripe.Event {
      return this.stripe.webhooks.constructEvent(
            payload,
            signature,
            webhookSecret,
      );
    }

  async createPayment(
    params: CreatePaymentParams,
  ): Promise<CreatePaymentResult> {
    const paymentIntent =
    await this.stripe.paymentIntents.create({
      amount: params.amount,
      currency: params.currency,
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never',
      },
      metadata: params.metadata,
    });

    if (!paymentIntent.client_secret) {
      throw new Error(
        'Stripe PaymentIntent did not return a client secret.',
      );
    }

    return {
      providerPaymentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret,
    };
  }
}