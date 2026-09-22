import { Module } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module';
import { CartModule } from '../cart/cart.module';
import { ProductsModule } from '../products/products.module';

import { OrdersController } from './orders.controller';
import { OrdersRepository } from './orders.repository';
import { OrderItemsRepository } from './order-items.repository';
import { OrdersService } from './orders.service';
import { PaymentsModule } from '../payments/payment.module';
import { StripeWebhookController } from '../payments/stripe-webhook.controller';
import { PendingCheckoutCleanupService } from './pending-checkout-cleanup.service';

@Module({
  imports: [
    DatabaseModule,
    CartModule,
    ProductsModule,
    PaymentsModule,
  ],
  controllers: [
    OrdersController,
    StripeWebhookController,
  ],
  providers: [
  OrdersService,
  OrdersRepository,
  OrderItemsRepository,
  PendingCheckoutCleanupService,
  ],
})
export class OrdersModule {}