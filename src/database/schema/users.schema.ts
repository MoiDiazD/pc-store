import { pgEnum } from 'drizzle-orm/pg-core';
import {
  integer,
  pgTable,
  text,
  varchar,
  timestamp
} from 'drizzle-orm/pg-core';
import { timestamps } from './common.schema';

export const userRoleEnum = pgEnum('user_role', [
  'customer',
  'worker',
  'manager',
]);

export const users = pgTable('users', {

  id: integer('id').generatedAlwaysAsIdentity().primaryKey(),

  name: varchar('name', { length: 200 }).notNull(),

  email: varchar('email', { length: 200 }).notNull().unique(),

  passwordHash: text('password_hash').notNull(),

  role: userRoleEnum('role').notNull().default('customer'),

  ...timestamps
});