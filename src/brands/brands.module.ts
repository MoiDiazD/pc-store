import { Module } from '@nestjs/common';

import { DatabaseModule } from '../database/database.module';

import { BrandsController } from './brands.controller';
import { BrandsRepository } from './brands.repository';
import { BrandsService } from './brands.service';

@Module({
  imports: [DatabaseModule],
  controllers: [BrandsController],
  providers: [
    BrandsService,
    BrandsRepository,
  ],
})
export class BrandsModule {}