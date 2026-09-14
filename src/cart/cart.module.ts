import { Module } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module';
import { ProductsModule } from '../products/products.module';

import { CartController } from './cart.controller';
import { CartItemsRepository } from './cart-items.repository';
import { CartRepository } from './cart.repository';
import { CartService } from './cart.service';

@Module({
  imports: [
    DatabaseModule,
    ProductsModule,
  ],
  controllers: [CartController],
  providers: [
    CartService,
    CartRepository,
    CartItemsRepository,
  ],
})
export class CartModule {}