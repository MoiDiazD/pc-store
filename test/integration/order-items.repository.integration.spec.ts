import { beforeEach, describe, expect, it } from 'vitest';

import { db } from '../helpers/database';
import { resetDatabase } from '../helpers/reset-database';
import { UsersRepository } from '../../src/users/users.repository';
import { BrandsRepository } from '../../src/brands/brands.repository';
import { ProductsRepository } from '../../src/products/products.repository';
import { OrdersRepository } from '../../src/orders/orders.repository';
import { OrderItemsRepository } from '../../src/orders/order-items.repository';

describe('OrderItemsRepository integration', () => {
  const repository = new OrderItemsRepository(db);
  const users = new UsersRepository(db);
  const brands = new BrandsRepository(db);
  const products = new ProductsRepository(db);
  const orders = new OrdersRepository(db);

  beforeEach(() => resetDatabase());

  it('creates many order items and finds them by order', async () => {
    const user = await users.create({
      name: 'User',
      email: 'items@example.com',
      passwordHash: 'hash',
      role: 'customer',
    });
    const brand = await brands.create({ name: 'NVIDIA' });
    const product1 = await products.create({
      name: 'RTX 5070',
      model: 'RTX-5070',
      description: 'GPU',
      price: '599.99',
      stock: 10,
      brandId: brand.id,
    });
    const product2 = await products.create({
      name: 'RTX 5080',
      model: 'RTX-5080',
      description: 'GPU',
      price: '999.99',
      stock: 5,
      brandId: brand.id,
    });
    const order = await orders.create({ userId: user.id, total: '1599.98', status: 'confirmed' });

    const items = await repository.createMany([
      { orderId: order.id, productId: product1.id, productName: product1.name, productModel: product1.model, quantity: 1, unitPrice: product1.price },
      { orderId: order.id, productId: product2.id, productName: product2.name, productModel: product2.model, quantity: 1, unitPrice: product2.price },
    ]);

    expect(items).toHaveLength(2);
    expect(await repository.findByOrderId(order.id)).toHaveLength(2);
  });
});
