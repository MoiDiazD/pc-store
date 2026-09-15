import { Inject, Injectable } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';

import { DATABASE } from '../database/database.provider';
import type { Database, DatabaseTransaction } from '../database/database.provider';

import { cartItems, products } from '../database/schema';

type CartItem = typeof cartItems.$inferSelect;
type DbExecutor = Database | DatabaseTransaction; 

@Injectable()
export class CartItemsRepository {
  constructor(
    @Inject(DATABASE)
    private readonly db: Database,
  ) {}

  async findByCartAndProduct(
    cartId: number,
    productId: number,
  ): Promise<CartItem | undefined> {
    const [item] = await this.db
      .select()
      .from(cartItems)
      .where(
        and(
          eq(cartItems.cartId, cartId),
          eq(cartItems.productId, productId),
        ),
      );

    return item;
  }

  async findByCartId(
    cartId: number,
    executor: DbExecutor = this.db,
  ) {
    return executor
      .select()
      .from(cartItems)
      .where(eq(cartItems.cartId, cartId));
  }

  async create(
    data: typeof cartItems.$inferInsert,
  ): Promise<CartItem> {
    const [item] = await this.db
      .insert(cartItems)
      .values(data)
      .returning();

    return item;
  }

  async updateQuantity(
    id: number,
    quantity: number,
  ): Promise<CartItem | undefined> {
    const [item] = await this.db
      .update(cartItems)
      .set({
        quantity,
      })
      .where(eq(cartItems.id, id))
      .returning();

    return item;
  }

  async remove(
    cartId: number,
    productId: number,
  ): Promise<boolean> {
    const deletedRows = await this.db
      .delete(cartItems)
      .where(
        and(
          eq(cartItems.cartId, cartId),
          eq(cartItems.productId, productId),
        ),
      )
      .returning();

    return deletedRows.length > 0;
  }

  async findDetailedByCartId(cartId: number, executor: DbExecutor = this.db) {
    return executor
      .select({
        product: {
          id: products.id,
          name: products.name,
          model: products.model,
          description: products.description,
          price: products.price,
          stock: products.stock,
        },
        quantity: cartItems.quantity,
      })
      .from(cartItems)
      .innerJoin(
        products,
        eq(cartItems.productId, products.id),
      )
      .where(
        and(
          eq(cartItems.cartId, cartId),
          isNull(products.deletedAt),
        ),
      );
  }

  async removeByCartId(
    cartId: number,
    executor: DbExecutor = this.db,
  ) {
    await executor
      .delete(cartItems)
      .where(eq(cartItems.cartId, cartId));
  }
}