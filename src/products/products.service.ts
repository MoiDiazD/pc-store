import { Injectable, NotFoundException } from '@nestjs/common';

import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

import { ProductsRepository } from './products.repository';

@Injectable()
export class ProductsService {
  constructor(
    private readonly productsRepository: ProductsRepository,
  ) {}

  findAll() {
    return this.productsRepository.findAll();
  }

  async findById(id: number) {
    const product = await this.productsRepository.findById(id);

    if (!product) {
      throw new NotFoundException(
        `Product with id ${id} not found`,
      );
    }

    return product;
  }

  create(product: CreateProductDto) {
    return this.productsRepository.create(product);
  }

  async update(id: number, product: UpdateProductDto) {
    const updatedProduct = await this.productsRepository.update(
      id,
      product,
    );

    if (!updatedProduct) {
      throw new NotFoundException(
        `Product with id ${id} not found`,
      );
    }

    return updatedProduct;
  }

  async delete(id: number) {
    const deletedProduct = await this.productsRepository.softDelete(id);

    if (!deletedProduct) {
      throw new NotFoundException(
        `Product with id ${id} not found`,
      );
    }

    return deletedProduct;
  }
}