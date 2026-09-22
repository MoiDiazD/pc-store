import { beforeEach, describe, expect, it } from 'vitest';

import { db } from '../helpers/database';
import { resetDatabase } from '../helpers/reset-database';
import { UsersRepository } from '../../src/users/users.repository';
import { OrdersRepository } from '../../src/orders/orders.repository';

describe('OrdersRepository integration', () => {
  const repository = new OrdersRepository(db);
  const users = new UsersRepository(db);

  beforeEach(() => resetDatabase());

  async function createUser() {
    return users.create({
      name: 'User',
      email: 'order@example.com',
      passwordHash: 'hash',
      role: 'customer',
    });
  }

  it('creates and finds orders by id and user', async () => {
    const user = await createUser();
    const order = await repository.create({ userId: user.id, total: '99.99', status: 'confirmed' });

    expect(await repository.findById(order.id)).toMatchObject({ id: order.id, total: '99.99' });
    expect(await repository.findByIdForUser(order.id, user.id)).toMatchObject({ id: order.id });
    expect(await repository.findByIdForUser(order.id, user.id + 1)).toBeUndefined();
    expect(await repository.findByUserId(user.id)).toHaveLength(1);
  });

  it('finds pending and expired pending orders', async () => {
    const user = await createUser();
    const pending = await repository.create({
      userId: user.id,
      total: '50.00',
      status: 'pending',
      expiresAt: new Date(Date.now() - 60_000),
    });

    expect((await repository.findPendingByUserId(user.id))?.id).toBe(pending.id);
    expect((await repository.findExpiredPending(new Date())).map((order) => order.id)).toContain(pending.id);
  });

  it('updates order status', async () => {
    const user = await createUser();
    const order = await repository.create({ userId: user.id, total: '50.00' });

    expect((await repository.updateStatus(order.id, 'confirmed'))?.status).toBe('confirmed');
  });
});
