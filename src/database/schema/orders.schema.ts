import {
  integer,
  numeric,
  pgEnum,
  pgTable,
  timestamp,
  index,
  uniqueIndex
} from 'drizzle-orm/pg-core';

import { sql } from 'drizzle-orm';

import { users } from './users.schema';

export const orderStatusEnum = pgEnum('order_status', [
  'pending',
  'confirmed',
  'cancelled',
]);

export const orders = pgTable('orders', {
    id: integer('id')
        .generatedAlwaysAsIdentity()
        .primaryKey(),

    userId: integer('user_id')
        .notNull()
        .references(() => users.id, {
        onDelete: 'no action',
        }),

    status: orderStatusEnum('status')
        .notNull()
        .default('pending'),

    total: numeric('total', {
        precision: 12,
        scale: 2,
    }).notNull(),

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
    }
    ,
  (table) => [
    index('orders_user_id_idx').on(table.userId),
    uniqueIndex('orders_one_pending_per_user_idx')
        .on(table.userId)
        .where(sql`${table.status} = 'pending'`),
        ],   
);