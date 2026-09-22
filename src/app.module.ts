import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ProductsModule } from './products/products.module';
import { DatabaseModule } from './database/database.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { BrandsModule } from './brands/brands.module';
import { CategoriesModule } from './categories/categories.module';
import { CartModule } from './cart/cart.module';
import { OrdersModule } from './orders/orders.module';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
    imports: [
    DatabaseModule,
    ProductsModule,
    UsersModule,
    AuthModule,
    BrandsModule,
    CategoriesModule,
    CartModule,
    OrdersModule,
    ScheduleModule.forRoot()
  ],
})
export class AppModule {}
