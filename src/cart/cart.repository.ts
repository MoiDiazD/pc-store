import { Inject, Injectable } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';

import { DATABASE } from '../database/database.provider';
import type { Database, DatabaseTransaction } from '../database/database.provider';

import { carts } from '../database/schema';

type Cart = typeof carts.$inferSelect;
type DbExecutor = Database | DatabaseTransaction;

@Injectable()
export class CartRepository {
  constructor(
    @Inject(DATABASE)
    private readonly db: Database,
  ) {}

  async findByUserId(
    userId: number,
    executor: DbExecutor = this.db,
  ): Promise<Cart | undefined> {
    const [cart] = await executor
      .select()
      .from(carts)
      .where(eq(carts.userId, userId))
      .limit(1);

    return cart;
  }

  async findByUserIdForUpdate(
    userId: number,
    executor: DbExecutor = this.db,
  ): Promise<Cart | undefined> {
    const [cart] = await executor
      .select()
      .from(carts)
      .where(eq(carts.userId, userId))
      .limit(1)
      .for('update');

    return cart;
  }

  async create(
    userId: number,
    executor: DbExecutor = this.db,
  ): Promise<Cart> {
    const [cart] = await executor
      .insert(carts)
      .values({
        userId,
      })
      .returning();

    return cart;
  }

  async lockForCheckout(
    cartId: number,
    executor: DbExecutor = this.db,
  ): Promise<Cart | undefined> {
    const [cart] = await executor
      .update(carts)
      .set({
        checkoutLockedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(carts.id, cartId),
          isNull(carts.checkoutLockedAt),
        ),
      )
      .returning();

    return cart;
  }

  async unlockCheckout(
    cartId: number,
    executor: DbExecutor = this.db,
  ): Promise<Cart | undefined> {
    const [cart] = await executor
      .update(carts)
      .set({
        checkoutLockedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(carts.id, cartId))
      .returning();

    return cart;
  }
}