import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { CategoriesRepository } from './categories.repository';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { ProductCategoriesRepository } from './product-categories.repository';
import { ProductsRepository } from '../products/products.repository';

@Injectable()
export class CategoriesService {
  constructor(
    private readonly categoriesRepository: CategoriesRepository,
    private readonly productsRepository: ProductsRepository,
    private readonly productCategoriesRepository: ProductCategoriesRepository,

  ) {}

  findAll() {
    return this.categoriesRepository.findAll();
  }

  async findById(id: number) {
    const category = await this.categoriesRepository.findById(id);

    if (!category) {
      throw new NotFoundException(
        `Category with id ${id} not found`,
      );
    }

    return category;
  }

  async findProducts(id: number) {
    const category = await this.categoriesRepository.findById(id);

    if (!category) {
      throw new NotFoundException(
        `Category with id ${id} not found`,
      );
    }

    return this.categoriesRepository.findProductsByCategoryId(id);
  }

  create(dto: CreateCategoryDto) {
    return this.categoriesRepository.create({
      name: dto.name.trim(),
    });
  }

  async update(
    id: number,
    dto: UpdateCategoryDto,
  ) {
    const updatedCategory =
      await this.categoriesRepository.update(id, {
        name: dto.name?.trim(),
      });

    if (!updatedCategory) {
      throw new NotFoundException(
        `Category with id ${id} not found`,
      );
    }

    return updatedCategory;
  }

  async delete(id: number) {
    const deletedCategory =
      await this.categoriesRepository.softDelete(id);

    if (!deletedCategory) {
      throw new NotFoundException(
        `Category with id ${id} not found`,
      );
    }

    return deletedCategory;
  }

  async restore(id: number) {
    const restoredCategory =
      await this.categoriesRepository.restore(id);

    if (!restoredCategory) {
      throw new NotFoundException(
        `Category with id ${id} not found`,
      );
    }

    return restoredCategory;
  }

  async addProduct(
    categoryId: number,
    productId: number,
  ) {
    const category =
      await this.categoriesRepository.findById(categoryId);

    if (!category) {
      throw new NotFoundException(
        `Category with id ${categoryId} not found`,
      );
    }

    const product =
      await this.productsRepository.findById(productId);

    if (!product) {
      throw new NotFoundException(
        `Product with id ${productId} not found`,
      );
    }
    return await this.productCategoriesRepository.add(
      categoryId,
      productId,
    );
  }

  async removeProduct(
    categoryId: number,
    productId: number,
  ) {
    const category =
      await this.categoriesRepository.findById(categoryId);

    if (!category) {
      throw new NotFoundException(
        `Category with id ${categoryId} not found`,
      );
    }

    const removed =
      await this.productCategoriesRepository.remove(
        categoryId,
        productId,
      );

    if (!removed) {
      throw new NotFoundException(
        `Product ${productId} is not associated with category ${categoryId}`,
      );
    }
  }
}