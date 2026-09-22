import { Inject, Injectable } from '@nestjs/common';
import { eq, and } from 'drizzle-orm';

import { DATABASE } from '../database/database.provider';

import type {
  Database,
  DatabaseTransaction,
} from '../database/database.provider';

import { payments } from '../database/schema/payments.schema';

type DbExecutor = Database | DatabaseTransaction;

@Injectable()
export class PaymentsRepository {
  constructor(
    @Inject(DATABASE)
    private readonly db: Database,
  ) {}

  async create(
    data: typeof payments.$inferInsert,
    executor: DbExecutor = this.db,
  ) {
    const [payment] = await executor
      .insert(payments)
      .values(data)
      .returning();

    return payment;
  }

  async findByProviderPaymentId(
    provider: string,
    providerPaymentId: string,
    executor: DbExecutor = this.db,
    ) {
    const [payment] = await executor
        .select()
        .from(payments)
        .where(
        and(
            eq(payments.provider, provider),
            eq(
            payments.providerPaymentId,
            providerPaymentId,
            ),
        ),
        )
        .limit(1);

    return payment;
  }

  async findByOrderId(
  orderId: number,
  executor: DbExecutor = this.db,
  ) {
    const [payment] = await executor
      .select()
      .from(payments)
      .where(eq(payments.orderId, orderId))
      .limit(1);

    return payment;
  }

  async updateStatus(
    id: number,
    status: 'pending' | 'succeeded' | 'failed' | 'cancelled',
    executor: DbExecutor = this.db,
  ) {
    const [payment] = await executor
      .update(payments)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(eq(payments.id, id))
      .returning();

    return payment;
  }

  async updateProviderPaymentId(
    id: number,
    providerPaymentId: string,
    executor: DbExecutor = this.db,
  ) {
    const [payment] = await executor
      .update(payments)
      .set({
        providerPaymentId,
        updatedAt: new Date(),
      })
      .where(eq(payments.id, id))
      .returning();

    return payment;
  }

}