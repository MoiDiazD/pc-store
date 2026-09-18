import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';

import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../auth/roles.decorator';

import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Controller('categories')
export class CategoriesController {
  constructor(
    private readonly categoriesService: CategoriesService,
  ) {}

  @Public()
  @Get()
  findAll() {
    return this.categoriesService.findAll();
  }

  @Public()
  @Get(':id')
  findById(@Param('id') id: string) {
    return this.categoriesService.findById(
      Number(id),
    );
  }

  @Public()
  @Get(':id/products')
  findProducts(@Param('id') id: string) {
    return this.categoriesService.findProducts(
      Number(id),
    );
  }

  @Roles('manager')
  @Post()
  create(@Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(dto);
  }

  @Roles('manager')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.categoriesService.update(
      Number(id),
      dto,
    );
  }

  @Roles('manager')
  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.categoriesService.delete(
      Number(id),
    );
  }

  @Roles('manager')
  @Patch(':id/restore')
  restore(@Param('id') id: string) {
    return this.categoriesService.restore(
      Number(id),
    );
  }

  @Roles('worker', 'manager')
  @Post(':id/products/:productId')
  addProduct(
    @Param('id') id: string,
    @Param('productId') productId: string,
  ) {
    return this.categoriesService.addProduct(
      Number(id),
      Number(productId),
    );
  }

  @Roles('worker', 'manager')
  @Delete(':id/products/:productId')
  removeProduct(
    @Param('id') id: string,
    @Param('productId') productId: string,
  ) {
    return this.categoriesService.removeProduct(
      Number(id),
      Number(productId),
    );
  }
}