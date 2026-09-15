import {
  BadRequestException,
  Inject,
  Injectable,
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
  ) {}

  async checkout(userId: number) {
    return this.db.transaction(async (tx) => {
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
        orderId: number;
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
          orderId: 0,
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
          status: 'confirmed',
          total,
        },
        tx,
      );

      for (const item of orderItemsData) {
        item.orderId = order.id;
      }

      const orderItems =
        await this.orderItemsRepository.createMany(
          orderItemsData,
          tx,
        );

      await this.cartItemsRepository.removeByCartId(
        cart.id,
        tx,
      );

      return {
        id: order.id,
        status: order.status,
        total: order.total,
        createdAt: order.createdAt,
        items: orderItems,
      };
    });
  }
}