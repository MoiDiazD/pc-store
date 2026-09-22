import { beforeEach, describe, expect, it } from 'vitest';

import { db } from '../helpers/database';
import { resetDatabase } from '../helpers/reset-database';
import { CartRepository } from '../../src/cart/cart.repository';
import { UsersRepository } from '../../src/users/users.repository';

describe('CartRepository integration', () => {
  const repository = new CartRepository(db);
  const users = new UsersRepository(db);

  beforeEach(() => resetDatabase());

  async function createCart() {
    const user = await users.create({
      name: 'User',
      email: 'cart@example.com',
      passwordHash: 'hash',
      role: 'customer',
    });
    return repository.create(user.id);
  }

  it('creates and finds a cart by user', async () => {
    const cart = await createCart();

    expect(await repository.findByUserId(cart.userId)).toMatchObject({ id: cart.id, userId: cart.userId });
    expect(await repository.findByUserIdForUpdate(cart.userId)).toMatchObject({ id: cart.id });
  });

  it('locks and unlocks a cart for checkout', async () => {
    const cart = await createCart();

    const locked = await repository.lockForCheckout(cart.id);
    expect(locked?.checkoutLockedAt).toBeInstanceOf(Date);

    expect(await repository.lockForCheckout(cart.id)).toBeUndefined();

    const unlocked = await repository.unlockCheckout(cart.id);
    expect(unlocked?.checkoutLockedAt).toBeNull();
    expect(await repository.lockForCheckout(cart.id)).toBeDefined();
  });
});
