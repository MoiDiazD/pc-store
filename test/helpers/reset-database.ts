import { sql } from 'drizzle-orm';

import { db } from './database';

export async function resetDatabase(): Promise<void> {
  await db.execute(sql.raw(`TRUNCATE TABLE payments, order_items, orders, cart_items, carts, sessions, products, categories, brands, users RESTART IDENTITY CASCADE`));
}
