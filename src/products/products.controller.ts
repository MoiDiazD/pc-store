import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

import { AuthGuard } from '../auth/auth.guard';
import { RoleGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Public } from '../auth/public.decorator';

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
}