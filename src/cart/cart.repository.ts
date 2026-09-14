import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';

import { DATABASE } from '../database/database.provider';
import type { Database } from '../database/database.provider';

import { carts } from '../database/schema';

type Cart = typeof carts.$inferSelect;

@Injectable()
export class CartRepository {
  constructor(
    @Inject(DATABASE)
    private readonly db: Database,
  ) {}

  async findByUserId(
    userId: number,
  ): Promise<Cart | undefined> {
    const [cart] = await this.db
      .select()
      .from(carts)
      .where(eq(carts.userId, userId));

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