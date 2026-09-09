import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ProductsModule } from './products/products.module';
import { DatabaseModule } from './database/database.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { BrandsModule } from './brands/brands.module';

@Module({
  imports: [
    DatabaseModule,
    ProductsModule,
    UsersModule,
    AuthModule,
    BrandsModule,
  ],
})
export class AppModule {}
