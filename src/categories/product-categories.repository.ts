import { Inject, Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';

import { DATABASE } from '../database/database.provider';
import type { Database } from '../database/database.provider';

import {
  productCategories,
} from '../database/schema';

type ProductCategory = typeof productCategories.$inferSelect;

@Injectable()
export class ProductCategoriesRepository {
  constructor(
    @Inject(DATABASE)
    private readonly db: Database,
  ) {}

  async add(
    categoryId: number,
    productId: number,
  ): Promise<ProductCategory> {
    const [relation] = await this.db
      .insert(productCategories)
      .values({
        categoryId,
        productId,
      })
      .returning();

    return relation;
  }

  async remove(
    categoryId: number,
    productId: number,
  ): Promise<boolean> {
    const deletedRows = await this.db
      .delete(productCategories)
      .where(
        and(
          eq(productCategories.categoryId, categoryId),
          eq(productCategories.productId, productId),
        ),
      )
      .returning();

    return deletedRows.length > 0;
  }
  
}