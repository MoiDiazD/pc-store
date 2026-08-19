import { Inject, Injectable } from '@nestjs/common';
import { DATABASE } from '../database/database.provider';
import type { Database } from '../database/database.provider';
import { products } from '../database/schema';


@Injectable()
export class ProductsService {
  constructor(
    @Inject(DATABASE)
    private readonly db: Database,
  ) {}

  findAll() {
    return this.db.select().from(products);
  }
}