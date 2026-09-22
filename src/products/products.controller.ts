import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';

import { AuthGuard } from '../auth/auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RoleGuard } from '../auth/roles.guard';
import { Public } from '../common/decorators/public.decorator';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductsService } from './products.service';

@Controller('products')
export class ProductsController {
  constructor(
    private readonly productsService: ProductsService,
  ) {}

  @Public()
  @Get(':id')
  findById(@Param('id') id: string) {
    return this.productsService.findById(Number(id));
  }

  @Public()
  @Get()
  findAll() {
    return this.productsService.findAll();
  }

  @Roles('worker', 'manager')
  @Post()
  create(@Body() product: CreateProductDto) {
    return this.productsService.create(product);
  }

  @Roles('worker', 'manager')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() product: UpdateProductDto,
  ) {
    return this.productsService.update(Number(id), product);
  }

  @Roles('worker', 'manager')
  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.productsService.delete(Number(id));
  }

  @Roles('manager')
  @Patch(':id/restore')
  restore(@Param('id') id: string) {
    return this.productsService.restore(Number(id));
  }
}
