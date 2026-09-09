import { Inject, Injectable } from '@nestjs/common';
import { and, eq, isNotNull, isNull } from 'drizzle-orm';

import { DATABASE } from '../database/database.provider';
import type { Database } from '../database/database.provider';

import { brands } from '../database/schema';

import { BaseRepository } from '../database/repositories/base.repository';

type Brand = typeof brands.$inferSelect;

@Injectable()
export class BrandsRepository extends BaseRepository<Brand> {
  constructor(
    @Inject(DATABASE)
    private readonly db: Database,
  ) {
    super();
  }

  async findById(id: number): Promise<Brand | undefined> {
    const [brand] = await this.db
      .select()
      .from(brands)
      .where(
        and(
          eq(brands.id, id),
          isNull(brands.deletedAt),
        ),
      );

    return brand;
  }

  async findAll(): Promise<Brand[]> {
    return this.db
      .select()
      .from(brands)
      .where(isNull(brands.deletedAt));
  }

  async create(
    data: typeof brands.$inferInsert,
  ): Promise<Brand> {
    const [brand] = await this.db
      .insert(brands)
      .values(data)
      .returning();

    return brand;
  }

  async update(
    id: number,
    data: Partial<typeof brands.$inferInsert>,
  ): Promise<Brand | undefined> {
    const [brand] = await this.db
      .update(brands)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(brands.id, id),
          isNull(brands.deletedAt),
        ),
      )
      .returning();

    return brand;
  }

  async softDelete(id: number): Promise<Brand | undefined> {
    const [brand] = await this.db
      .update(brands)
      .set({
        deletedAt: new Date(),
      })
      .where(
        and(
          eq(brands.id, id),
          isNull(brands.deletedAt),
        ),
      )
      .returning();

    return brand;
  }

  async restore(id: number): Promise<Brand | undefined> {
    const [brand] = await this.db
      .update(brands)
      .set({
        deletedAt: null,
      })
      .where(
        and(
          eq(brands.id, id),
          isNotNull(brands.deletedAt),
        ),
      )
      .returning();

    return brand;
  }
}