import { integer, pgTable, primaryKey, index } from 'drizzle-orm/pg-core';
import { categories } from './categories.schema';
import { products } from './products.schema';

export const productCategories = pgTable(
  'product_categories',
  {
     productId: integer('product_id')
      .notNull()
      .references(() => products.id, {
        onDelete: 'cascade',
      }),

    categoryId: integer('category_id')
      .notNull()
      .references(() => categories.id, {
        onDelete: 'cascade',
      }),
  },
  (table) => [
    primaryKey({
      columns: [table.productId, table.categoryId],
    }),
    index('product_categories_category_id_idx').on(table.categoryId),
  ],
);