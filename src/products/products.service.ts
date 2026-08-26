import { Inject, Injectable } from '@nestjs/common';
import { DATABASE } from '../database/database.provider';
import type { Database } from '../database/database.provider';
import { products } from '../database/schema';
import { eq } from 'drizzle-orm';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';


@Injectable()
export class ProductsService {
  constructor(
    @Inject(DATABASE)
    private readonly db: Database,
  ) {}

  findById(id: number) {
    return this.db.select()
        .from(products)
          .where(eq(products.id, id))
    .execute();
  }
  
  findAll() {
    return this.db.select().from(products);
  }

  create(product: CreateProductDto) {
    return this.db
      .insert(products)
        .values(product)
          .returning();
  }
  update(id: number, product: UpdateProductDto) {
    return this.db
      .update(products)
        .set({
          ...product,
          updatedAt: new Date(),
        })
          .where(eq(products.id, id))
    .returning();
  }
  
  delete(id: number) {
    return this.db
      .delete(products)
        .where(eq(products.id, id))
    .returning();
  }
}