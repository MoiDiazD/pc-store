import {
  Injectable,
  Logger,
} from '@nestjs/common';

import {
  Cron,
  CronExpression,
} from '@nestjs/schedule';

import {
  OrdersRepository,
} from './orders.repository';

import {
  OrdersService,
} from './orders.service';

import {
  PaymentsRepository,
} from '../payments/payments.repository';

import {
  StripePaymentProvider,
} from '../payments/stripe-payment.provider';

@Injectable()
export class PendingCheckoutCleanupService {
  private readonly logger = new Logger(
    PendingCheckoutCleanupService.name,
  );

  constructor(
    private readonly ordersRepository: OrdersRepository,
    private readonly ordersService: OrdersService,
    private readonly paymentsRepository: PaymentsRepository,
    private readonly stripePaymentProvider: StripePaymentProvider,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE, {
    name: 'pending-checkout-cleanup',
    waitForCompletion: true,
  })
  async handleExpiredCheckouts() {
    const expiredOrders =
      await this.ordersRepository.findExpiredPending();

    for (const order of expiredOrders) {
      try {
        const payment =
          await this.paymentsRepository.findByOrderId(
            order.id,
          );

        if (!payment || payment.status !== 'pending') {
          continue;
        }

        const paymentIntent =
          await this.stripePaymentProvider.cancelPayment(
            payment.providerPaymentId,
          );

        if (paymentIntent.status !== 'canceled') {
          continue;
        }

        await this.ordersService.cancelExpiredCheckout(
          order.id,
        );

        this.logger.log(
          `Expired checkout cancelled: order=${order.id}`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to cleanup expired checkout: order=${order.id}`,
          error instanceof Error
            ? error.stack
            : String(error),
        );
      }
    }
  }
}