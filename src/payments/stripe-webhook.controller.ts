import {
  BadRequestException,
  Controller,
  Headers,
  HttpCode,
  Post,
  Req,
} from '@nestjs/common';

import type { RawBodyRequest } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';

import Stripe from 'stripe';

import { Public } from '../common/decorators/public.decorator';
import { StripePaymentProvider } from '../payments/stripe-payment.provider';

import { OrdersService } from '../orders/orders.service';

@Controller('payments')
export class StripeWebhookController {
  constructor(
    private readonly stripePaymentProvider: StripePaymentProvider,
    private readonly ordersService: OrdersService,
  ) {}

  @Public()
  @Post('webhook')
  @HttpCode(200)
  async webhook(
    @Req() request: RawBodyRequest<FastifyRequest>,
    @Headers('stripe-signature') signature?: string,
  ) {
    const webhookSecret =
      process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret || !signature) {
      return {
        received: false,
      };
    }

    let event: Stripe.Event;

    try {
      event =
        this.stripePaymentProvider.constructWebhookEvent(
          request.rawBody!,
          signature,
          webhookSecret,
        );
    } catch {
      // Aquí sí queremos rechazar el webhook.
      // No queremos que una petición cualquiera pueda
      // fingir ser Stripe.
      throw new BadRequestException('Invalid Stripe webhook signature.');
    }

    switch (event.type) {
      case 'payment_intent.succeeded':
        await this.ordersService.confirmPayment({
          provider: 'stripe',
          providerPaymentId: event.data.object.id,
          orderId: event.data.object.metadata.orderId,
          amount: event.data.object.amount,
          currency: event.data.object.currency,
        });
      break;
      case 'payment_intent.payment_failed':
        await this.ordersService.cancelPayment({
          provider: 'stripe',
          providerPaymentId: event.data.object.id,
          orderId: event.data.object.metadata.orderId,
          amount: event.data.object.amount,
          currency: event.data.object.currency,
        });
      break;

      default:
      break;
    }

    return {
      received: true,
    };
  }
}