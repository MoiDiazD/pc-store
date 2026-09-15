import { Inject, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';

import { DATABASE } from '../database/database.provider';

import type {
  Database,
  DatabaseTransaction,
} from '../database/database.provider';
import { orderItems } from '../database/schema/order-items.schema';

type DbExecutor = Database | DatabaseTransaction;

@Injectable()
export class OrderItemsRepository {
  constructor(
    @Inject(DATABASE)
    private readonly db: Database,
  ) {}

  async createMany(
    data: (typeof orderItems.$inferInsert)[],
    executor: DbExecutor = this.db,
  ) {
    return executor
      .insert(orderItems)
      .values(data)
      .returning();
  }

  async findByOrderId(
    orderId: number,
    executor: DbExecutor = this.db,
  ) {
    return executor
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, orderId));
  }
}