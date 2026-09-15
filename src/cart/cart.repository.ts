import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';

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

  async create(userId: number): Promise<Cart> {
    const [cart] = await this.db
      .insert(carts)
      .values({
        userId,
      })
      .returning();

    return cart;
  }
}