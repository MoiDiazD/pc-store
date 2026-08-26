import { pgEnum } from 'drizzle-orm/pg-core';
import {
  integer,
  pgTable,
  text,
  varchar,
  timestamp
} from 'drizzle-orm/pg-core';

export const userRoleEnum = pgEnum('user_role', [
  'customer',
  'worker',
  'manager',
]);

export const users = pgTable('users', {

  id: integer('id').generatedAlwaysAsIdentity().primaryKey(),

  name: varchar('name', { length: 200 }).notNull(),

  email: varchar('email', { length: 200 }).notNull().unique(),

  password: text('password').notNull(),

  role: userRoleEnum('role').notNull().default('customer'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});