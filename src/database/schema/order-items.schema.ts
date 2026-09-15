import {
  check,
  integer,
  numeric,
  pgTable,
  varchar,
  index
} from 'drizzle-orm/pg-core';

import { orders } from './orders.schema';
import { products } from './products.schema';

import { sql } from 'drizzle-orm';

export const orderItems = pgTable(
  'order_items',
  {
    id: integer('id')
      .generatedAlwaysAsIdentity()
      .primaryKey(),

    orderId: integer('order_id')
      .notNull()
      .references(() => orders.id, {
        onDelete: 'cascade',
      }),

    productId: integer('product_id')
      .notNull()
      .references(() => products.id, {
        onDelete: 'no action',
      }),

    productName: varchar('product_name', {
      length: 200,
    }).notNull(),

    productModel: varchar('product_model', {
      length: 150,
    }).notNull(),

    quantity: integer('quantity').notNull(),

    unitPrice: numeric('unit_price', {
      precision: 10,
      scale: 2,
    }).notNull(),
  },
  (table) => [
    index('order_items_order_id_idx').on(table.orderId),
    check(
      'order_items_quantity_positive',
      sql`${table.quantity} > 0`,
    ),

    check(
      'order_items_unit_price_non_negative',
      sql`${table.unitPrice} >= 0`,
    ),
  ],
);