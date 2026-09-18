import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import {
  DATABASE,
  type Database,
} from '../database/database.provider';

import { CartRepository } from '../cart/cart.repository';
import { CartItemsRepository } from '../cart/cart-items.repository';
import { ProductsRepository } from '../products/products.repository';

import { OrdersRepository } from './orders.repository';
import { OrderItemsRepository } from './order-items.repository';

import { PaymentService } from '../payments/payment.service';
import { PaymentsRepository } from '../payments/payments.repository';


type ConfirmPaymentData = {
  provider: string;
  providerPaymentId: string;
  orderId: string;
  amount: number;
  currency: string;
};

@Injectable()
export class OrdersService {
  constructor(
    @Inject(DATABASE)
    private readonly db: Database,

    private readonly cartRepository: CartRepository,
    private readonly cartItemsRepository: CartItemsRepository,
    private readonly productsRepository: ProductsRepository,
    private readonly ordersRepository: OrdersRepository,
    private readonly orderItemsRepository: OrderItemsRepository,
    private readonly paymentService: PaymentService,
    private readonly paymentsRepository: PaymentsRepository,
  ) {}

  async checkout(userId: number) {
    const checkoutData = await this.db.transaction(async (tx) => {
      const cart = await this.cartRepository.findByUserId(
        userId,
        tx,
      );

      if (!cart) {
        throw new BadRequestException('Cart is empty.');
      }

      const items = await this.cartItemsRepository.findByCartId(
        cart.id,
        tx,
      );

      if (items.length === 0) {
        throw new BadRequestException('Cart is empty.');
      }

      const orderItemsData: Array<{
        productId: number;
        productName: string;
        productModel: string;
        quantity: number;
        unitPrice: string;
      }> = [];

      let totalCents = 0;

      for (const item of items) {
        const product =
          await this.productsRepository.decrementStockIfAvailable(
            item.productId,
            item.quantity,
            tx,
          );

        if (!product) {
          throw new BadRequestException(
            `Insufficient stock for product ${item.productId}.`,
          );
        }

        const unitPriceCents = Math.round(
          Number(product.price) * 100,
        );

        totalCents += unitPriceCents * item.quantity;

        orderItemsData.push({
          productId: product.id,
          productName: product.name,
          productModel: product.model,
          quantity: item.quantity,
          unitPrice: product.price,
        });
      }

      const total = (totalCents / 100).toFixed(2);

      const order = await this.ordersRepository.create(
        {
          userId,
          status: 'pending',
          total,
        },
        tx,
      );

      await this.orderItemsRepository.createMany(
        orderItemsData.map((item) => ({
          ...item,
          orderId: order.id,
        })),
        tx,
      );

      return {
        orderId: order.id,
        cartId: cart.id,
        amount: totalCents,
        currency: 'EUR',
      };
    });

    const payment =
      await this.paymentService.createPayment(
        'stripe',
        checkoutData.amount,
        checkoutData.currency.toLowerCase(),
        {
          orderId: String(checkoutData.orderId),
          userId: String(userId),
        },
      );

    const savedPayment =
      await this.paymentsRepository.create({
        orderId: checkoutData.orderId,
        provider: 'stripe',
        providerPaymentId: payment.providerPaymentId,
        status: 'pending',
        amount: checkoutData.amount,
        currency: checkoutData.currency,
      });

    return {
      orderId: checkoutData.orderId,
      paymentId: savedPayment.id,
      provider: 'stripe',
      clientSecret: payment.clientSecret,
    };
  }

  async confirmPayment(data: ConfirmPaymentData) {
  const orderId = Number(data.orderId);

  if (!Number.isInteger(orderId)) {
    throw new BadRequestException(
      'Invalid order ID.',
    );
  }

  await this.db.transaction(async (tx) => {
      const payment =
        await this.paymentsRepository.findByProviderPaymentId(
          data.provider,
          data.providerPaymentId,
          tx,
        );

      if (!payment) {
        throw new NotFoundException(
          'Payment not found.',
        );
      }

      if (
        payment.amount !== data.amount ||
        payment.currency.toLowerCase() !==
          data.currency.toLowerCase()
      ) {
        throw new BadRequestException(
          'Payment amount or currency mismatch.',
        );
      }

      if (payment.status === 'succeeded') {
        return;
      }

      const order =
        await this.ordersRepository.findById(
          payment.orderId,
          tx,
        );

      if (!order) {
        throw new NotFoundException(
          'Order not found.',
        );
      }

      if (order.id !== orderId) {
        throw new BadRequestException(
          'Payment does not belong to the order.',
        );
      }

      if (order.status !== 'pending') {
        return;
      }

      await this.paymentsRepository.updateStatus(
        payment.id,
        'succeeded',
        tx,
      );

      await this.ordersRepository.updateStatus(
        order.id,
        'confirmed',
        tx,
      );

      const cart =
        await this.cartRepository.findByUserId(
          order.userId,
          tx,
        );

      if (cart) {
        await this.cartItemsRepository.removeByCartId(
          cart.id,
          tx,
        );
      }
    });
  }
}