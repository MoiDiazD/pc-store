import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  numeric,
  pgTable,
  text,
  varchar,
} from 'drizzle-orm/pg-core';
import { brands } from './brands.schema';

export const products = pgTable(
  'products',
  {
    id: integer('id').generatedAlwaysAsIdentity().primaryKey(),

    name: varchar('name', { length: 200 }).notNull(),

    model: varchar('model', { length: 150 }).notNull(),

    description: text('description'),

    price: numeric('price', {
      precision: 10,
      scale: 2,
    }).notNull(),

    stock: integer('stock').notNull(),

    brandId: integer('brand_id')
      .notNull()
      .references(() => brands.id),
  },
  (table) => [
    check('products_price_non_negative', sql`${table.price} >= 0`),
    check('products_stock_non_negative', sql`${table.stock} >= 0`),
    index('products_brand_id_idx').on(table.brandId),
  ],
);