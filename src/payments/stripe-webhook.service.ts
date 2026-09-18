import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import Stripe from 'stripe';

import { OrdersRepository } from '../orders/orders.repository';
import { OrderItemsRepository } from '../orders/order-items.repository';
import { CartRepository } from '../cart/cart.repository';
import { CartItemsRepository } from '../cart/cart-items.repository';

import { PaymentsRepository } from './payments.repository';
import { StripePaymentProvider } from './stripe-payment.provider';

import { Inject } from '@nestjs/common';

import { DATABASE } from '../database/database.provider';

import type { Database } from '../database/database.provider';

@Injectable()
export class StripeWebhookService {
  constructor(
    private readonly stripePaymentProvider: StripePaymentProvider,
    private readonly paymentsRepository: PaymentsRepository,
    private readonly ordersRepository: OrdersRepository,
    private readonly orderItemsRepository: OrderItemsRepository,
    private readonly cartRepository: CartRepository,
    private readonly cartItemsRepository: CartItemsRepository,

    @Inject(DATABASE)
    private readonly db: Database
  ) {}

  async handle(
    payload: Buffer,
    signature?: string,
  ) {
    if (!signature) {
      throw new BadRequestException(
        'Missing Stripe signature.',
      );
    }

    const webhookSecret =
      process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      throw new Error(
        'STRIPE_WEBHOOK_SECRET is not configured.',
      );
    }

    let event: Stripe.Event;

    try {
      event =
        this.stripePaymentProvider.constructWebhookEvent(
          payload,
          signature,
          webhookSecret,
        );
    } catch {
      throw new BadRequestException(
        'Invalid Stripe webhook signature.',
      );
    }

    switch (event.type) {
      case 'payment_intent.succeeded':
        await this.handlePaymentIntentSucceeded(
          event.data.object,
        );
        break;

      default:
        break;
    }

    return {
      received: true,
    };
  }

  private async handlePaymentIntentSucceeded(
    paymentIntent: Stripe.PaymentIntent,
  ) {
    const payment =
      await this.paymentsRepository.findByProviderPaymentId(
        'stripe',
        paymentIntent.id,
      );

    if (!payment) {
      throw new NotFoundException(
        'Payment not found.',
      );
    }

    if (payment.status === 'succeeded') {
      return;
    }

    const order =
      await this.ordersRepository.findById(
        payment.orderId,
      );

    if (!order) {
      throw new NotFoundException(
        'Order not found.',
      );
    }

    if (order.status !== 'pending') {
      return;
    }

    const savedPayment =
      await this.paymentsRepository.updateStatus(
        payment.id,
        'succeeded',
      );

    if (!savedPayment) {
      return;
    }

    await this.ordersRepository.updateStatus(
      order.id,
      'confirmed',
    );

    const cart =
      await this.cartRepository.findByUserId(
        order.userId,
      );

    if (!cart) {
      return;
    }

    await this.cartItemsRepository.removeByCartId(
      cart.id,
    );
  }
}