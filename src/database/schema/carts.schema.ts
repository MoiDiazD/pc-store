import {
  integer,
  pgTable,
  timestamp,
} from 'drizzle-orm/pg-core';

import { users } from './users.schema';

export const carts = pgTable('carts', {
  id: integer('id')
    .generatedAlwaysAsIdentity()
    .primaryKey(),

  userId: integer('user_id')
    .notNull()
    .unique()
    .references(() => users.id, {
      onDelete: 'cascade',
    }),

  createdAt: timestamp('created_at', {
    withTimezone: true,
  })
    .defaultNow()
    .notNull(),

  updatedAt: timestamp('updated_at', {
    withTimezone: true,
  })
    .defaultNow()
    .notNull(),
});