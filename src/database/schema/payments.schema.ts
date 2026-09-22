import {
  index,
  integer,
  pgEnum,
  pgTable,
  unique,
  varchar,
  timestamp,
} from 'drizzle-orm/pg-core';

import { orders } from './orders.schema';

export const paymentStatusEnum = pgEnum('payment_status', [
  'pending',
  'succeeded',
  'failed',
  'cancelled',
]);

export const payments = pgTable(
  'payments',
  {
    id: integer('id').generatedAlwaysAsIdentity().primaryKey(),
    orderId: integer('order_id').notNull().references(() => orders.id, { onDelete: 'no action' }),
    provider: varchar('provider', { length: 50 }).notNull(),
    providerPaymentId: varchar('provider_payment_id', { length: 255 }).notNull(),
    status: paymentStatusEnum('status').notNull().default('pending'),
    amount: integer('amount').notNull(),
    currency: varchar('currency', { length: 3 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('payments_order_id_idx').on(table.orderId),
    unique('payments_provider_payment_id_unique').on(table.provider, table.providerPaymentId),
  ],
);
