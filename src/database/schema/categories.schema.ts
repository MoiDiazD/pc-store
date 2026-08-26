import { integer, pgTable, varchar, timestamp } from 'drizzle-orm/pg-core';

export const categories = pgTable('categories', {
  
  id: integer('id').generatedAlwaysAsIdentity().primaryKey(),
  
  name: varchar('name', { length: 100 }).notNull().unique(),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
  
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});