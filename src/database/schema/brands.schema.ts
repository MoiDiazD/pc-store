import {
  integer,
  pgTable,
  varchar,
} from 'drizzle-orm/pg-core';

import { timestamps } from './common.schema';

export const brands = pgTable('brands', {
  id: integer('id')
    .generatedAlwaysAsIdentity()
    .primaryKey(),

  name: varchar('name', {
    length: 100,
  }).notNull().unique(),

  ...timestamps,
});