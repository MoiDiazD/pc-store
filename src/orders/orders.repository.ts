import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';

import { DATABASE } from '../database/database.provider';

import type {
  Database,
  DatabaseTransaction,
} from '../database/database.provider';
import { orders } from '../database/schema/orders.schema';

type DbExecutor = Database | DatabaseTransaction;

@Injectable()
export class OrdersRepository {
  constructor(
    @Inject(DATABASE)
    private readonly db: Database,
  ) {}

  async create(
    data: typeof orders.$inferInsert,
    executor: DbExecutor = this.db,
  ) {
    const [order] = await executor
      .insert(orders)
      .values(data)
      .returning();

    return order;
  }

  async findById(
    id: number,
    executor: DbExecutor = this.db,
  ) {
    const [order] = await executor
      .select()
      .from(orders)
      .where(eq(orders.id, id))
      .limit(1);

    return order;
  }

  async findByUserId(
    userId: number,
    executor: DbExecutor = this.db,
  ) {
    return executor
      .select()
      .from(orders)
      .where(eq(orders.userId, userId))
      .orderBy(desc(orders.createdAt));
  }

  async findPendingByUserId(
    userId: number,
    executor: DbExecutor = this.db,
  ) {
    const [order] = await executor
      .select()
      .from(orders)
      .where(
        and(
          eq(orders.userId, userId),
          eq(orders.status, 'pending'),
        ),
      )
      .limit(1);

    return order;
  }

  async updateStatus(
    id: number,
    status: 'pending' | 'confirmed' | 'cancelled',
    executor: DbExecutor = this.db,
  ) {
    const [order] = await executor
      .update(orders)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, id))
      .returning();

    return order;
  }
}