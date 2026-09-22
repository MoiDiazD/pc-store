import { beforeEach, describe, expect, it } from 'vitest';

import { db } from '../helpers/database';
import { resetDatabase } from '../helpers/reset-database';
import { UsersRepository } from '../../src/users/users.repository';
import { OrdersRepository } from '../../src/orders/orders.repository';
import { PaymentsRepository } from '../../src/payments/payments.repository';

describe('PaymentsRepository integration', () => {
  const repository = new PaymentsRepository(db);
  const users = new UsersRepository(db);
  const orders = new OrdersRepository(db);

  beforeEach(() => resetDatabase());

  it('creates and finds a payment by provider id and order', async () => {
    const user = await users.create({
      name: 'User',
      email: 'payment@example.com',
      passwordHash: 'hash',
      role: 'customer',
    });
    const order = await orders.create({ userId: user.id, total: '25.00', status: 'confirmed' });

    const payment = await repository.create({
      orderId: order.id,
      provider: 'stripe',
      providerPaymentId: 'pi_123',
      status: 'pending',
      amount: 2500,
      currency: 'EUR',
    });

    expect(await repository.findByProviderPaymentId('stripe', 'pi_123')).toMatchObject({ id: payment.id });
    expect(await repository.findByOrderId(order.id)).toMatchObject({ id: payment.id });
  });

  it('updates payment status and provider payment id', async () => {
    const user = await users.create({
      name: 'User',
      email: 'payment@example.com',
      passwordHash: 'hash',
      role: 'customer',
    });
    const order = await orders.create({ userId: user.id, total: '25.00', status: 'confirmed' });
    const payment = await repository.create({
      orderId: order.id,
      provider: 'stripe',
      providerPaymentId: 'pi_old',
      amount: 2500,
      currency: 'EUR',
    });

    expect((await repository.updateStatus(payment.id, 'succeeded'))?.status).toBe('succeeded');
    expect((await repository.updateProviderPaymentId(payment.id, 'pi_new'))?.providerPaymentId).toBe('pi_new');
    expect(await repository.findByProviderPaymentId('stripe', 'pi_old')).toBeUndefined();
    expect(await repository.findByProviderPaymentId('stripe', 'pi_new')).toBeDefined();
  });
});
