import { Module } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module';

import { CategoriesController } from './categories.controller';
import { CategoriesRepository } from './categories.repository';
import { CategoriesService } from './categories.service';
import { ProductCategoriesRepository } from './product-categories.repository';
import { ProductsModule } from '../products/products.module';

@Module({
  imports: [
    DatabaseModule,
    ProductsModule,
  ],
  controllers: [CategoriesController],
  providers: [
    CategoriesService,
    CategoriesRepository,
    ProductCategoriesRepository,
  ],
  exports: [
    ProductCategoriesRepository,
  ],
})
export class CategoriesModule {}