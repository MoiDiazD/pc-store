import {
  index,
  pgTable,
  text,
  timestamp,
  integer
} from 'drizzle-orm/pg-core';

import { users } from './users.schema';

export const sessions = pgTable(
  'sessions',
  {
    id: text('id').primaryKey(),

    userId: integer('user_id')
      .notNull()
      .references(() => users.id, {
        onDelete: 'cascade',
      })
      .notNull(),

    expiresAt: timestamp('expires_at', {
      withTimezone: true,
    }).notNull(),

    revokedAt: timestamp('revoked_at', {
      withTimezone: true,
    }),

    createdAt: timestamp('created_at', {
      withTimezone: true,
    })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index('sessions_user_id_idx').on(table.userId),
  ],
);