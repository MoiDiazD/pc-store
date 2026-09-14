import {
  check,
  integer,
  pgTable,
  unique,
} from 'drizzle-orm/pg-core';

import { carts } from './carts.schema';
import { products } from './products.schema';

import { sql } from 'drizzle-orm';

export const cartItems = pgTable(
  'cart_items',
  {
    id: integer('id')
      .generatedAlwaysAsIdentity()
      .primaryKey(),

    cartId: integer('cart_id')
      .notNull()
      .references(() => carts.id, {
        onDelete: 'cascade',
      }),

    productId: integer('product_id')
      .notNull()
      .references(() => products.id),

    quantity: integer('quantity').notNull(),
  },
  (table) => [
    unique('cart_items_cart_product_unique').on(
      table.cartId,
      table.productId,
    ),

    check(
      'cart_items_quantity_positive',
      sql`${table.quantity} > 0`,
    ),
  ],
);