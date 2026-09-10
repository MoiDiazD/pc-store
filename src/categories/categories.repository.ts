import { Inject, Injectable } from '@nestjs/common';
import { and, eq, isNotNull, isNull } from 'drizzle-orm';

import { DATABASE } from '../database/database.provider';
import type { Database } from '../database/database.provider';

import { categories, productCategories, products } from '../database/schema';

import { BaseRepository } from '../database/repositories/base.repository';

type Category = typeof categories.$inferSelect;

@Injectable()
export class CategoriesRepository extends BaseRepository<Category> {
  constructor(
    @Inject(DATABASE)
    private readonly db: Database,
  ) {
    super();
  }

  async findById(
    id: number,
  ): Promise<Category | undefined> {
    const [category] = await this.db
      .select()
      .from(categories)
      .where(
        and(
          eq(categories.id, id),
          isNull(categories.deletedAt),
        ),
      );

    return category;
  }

  async findAll(): Promise<Category[]> {
    return this.db
      .select()
      .from(categories)
      .where(isNull(categories.deletedAt));
  }

  async create(
    data: typeof categories.$inferInsert,
  ): Promise<Category> {
    const [category] = await this.db
      .insert(categories)
      .values(data)
      .returning();

    return category;
  }

  async update(
    id: number,
    data: Partial<typeof categories.$inferInsert>,
  ): Promise<Category | undefined> {
    const [category] = await this.db
      .update(categories)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(categories.id, id),
          isNull(categories.deletedAt),
        ),
      )
      .returning();

    return category;
  }

  async softDelete(
    id: number,
  ): Promise<Category | undefined> {
    const [category] = await this.db
      .update(categories)
      .set({
        deletedAt: new Date(),
      })
      .where(
        and(
          eq(categories.id, id),
          isNull(categories.deletedAt),
        ),
      )
      .returning();

    return category;
  }

  async restore(
    id: number,
  ): Promise<Category | undefined> {
    const [category] = await this.db
      .update(categories)
      .set({
        deletedAt: null,
      })
      .where(
        and(
          eq(categories.id, id),
          isNotNull(categories.deletedAt),
        ),
      )
      .returning();

    return category;
  }

  async findProductsByCategoryId(
    categoryId: number,
  ) {
    return this.db
      .select({
        id: products.id,
        name: products.name,
        model: products.model,
        description: products.description,
        price: products.price,
        stock: products.stock,
        brandId: products.brandId,
        createdAt: products.createdAt,
        updatedAt: products.updatedAt,
      })
      .from(productCategories)
      .innerJoin(
        categories,
        eq(productCategories.categoryId, categories.id),
      )
      .innerJoin(
        products,
        eq(productCategories.productId, products.id),
      )
      .where(
        and(
          eq(categories.id, categoryId),
          isNull(categories.deletedAt),
          isNull(products.deletedAt),
        ),
      );
  }
}