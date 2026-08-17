import { integer, pgTable, varchar } from 'drizzle-orm/pg-core';

export const categories = pgTable('categories', {
  id: integer('id').generatedAlwaysAsIdentity().primaryKey(),
  name: varchar('name', { length: 100 }).notNull().unique(),
});