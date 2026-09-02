import { Inject, Injectable } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';

import { DATABASE } from '../database/database.provider';
import type { Database } from '../database/database.provider';

import { products } from '../database/schema';

import { BaseRepository } from '../database/repositories/base.repository';

type Product = typeof products.$inferSelect;

@Injectable()
export class ProductsRepository extends BaseRepository<Product> {
  constructor(
    @Inject(DATABASE)
    private readonly db: Database,
  ) {
    super();
  }

  async findById(id: number): Promise<Product | undefined> {
    const [product] = await this.db
      .select()
      .from(products)
      .where(
        and(
          eq(products.id, id),
          isNull(products.deletedAt),
        ),
      );

    return product;
  }

  async findAll(): Promise<Product[]> {
    return this.db
      .select()
      .from(products)
      .where(isNull(products.deletedAt));
  }

  async create(data: typeof products.$inferInsert): Promise<Product> {
    const [product] = await this.db
      .insert(products)
      .values(data)
      .returning();

    return product;
  }

  async update(
    id: number,
    data: Partial<typeof products.$inferInsert>,
  ): Promise<Product | undefined> {
    const [product] = await this.db
      .update(products)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(products.id, id),
          isNull(products.deletedAt),
        ),
      )
      .returning();

    return product;
  }

  async softDelete(id: number): Promise<Product | undefined> {
  const [product] = await this.db
    .update(products)
    .set({
      deletedAt: new Date(),
    })
    .where(
      and(
        eq(products.id, id),
        isNull(products.deletedAt),
      ),
    )
    .returning();

  return product;
}

  async restore(id: number): Promise<void> {
    await this.db
      .update(products)
      .set({
        deletedAt: null,
      })
      .where(eq(products.id, id));
  }
}