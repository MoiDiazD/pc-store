import { Module } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module';
import { CartModule } from '../cart/cart.module';
import { ProductsModule } from '../products/products.module';

import { OrdersController } from './orders.controller';
import { OrdersRepository } from './orders.repository';
import { OrderItemsRepository } from './order-items.repository';
import { OrdersService } from './orders.service';
import { PaymentsModule } from '../payments/payment.module';

@Module({
  imports: [
    DatabaseModule,
    CartModule,
    ProductsModule,
    PaymentsModule,
  ],
  controllers: [OrdersController],
  providers: [
    OrdersService,
    OrdersRepository,
    OrderItemsRepository,
  ],
})
export class OrdersModule {}