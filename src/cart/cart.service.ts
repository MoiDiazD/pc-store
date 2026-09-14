import {
    BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { ProductsRepository } from '../products/products.repository';

import { CartItemsRepository } from './cart-items.repository';
import { CartRepository } from './cart.repository';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';

@Injectable()
export class CartService {
  constructor(
    private readonly cartRepository: CartRepository,
    private readonly cartItemsRepository: CartItemsRepository,
    private readonly productsRepository: ProductsRepository,
  ) {}

  async getCart(userId: number) {
    let cart = await this.cartRepository.findByUserId(userId);

    if (!cart) {
      cart = await this.cartRepository.create(userId);
    }

    const items = await this.cartItemsRepository.findDetailedByCartId(
      cart.id,
    );

    return {
      id: cart.id,
      items,
      createdAt: cart.createdAt,
      updatedAt: cart.updatedAt,
    };
  }

  async addItem(
    userId: number,
    dto: AddCartItemDto,
  ) {
    let cart = await this.cartRepository.findByUserId(userId);

    if (!cart) {
      cart = await this.cartRepository.create(userId);
    }

    const product =
      await this.productsRepository.findById(dto.productId);

    if (!product) {
      throw new NotFoundException(
        `Product with id ${dto.productId} not found`,
      );
    }

    if (dto.quantity > product.stock) {
      throw new BadRequestException(
        `Not enough stock for product ${dto.productId}`,
      );
    }

    const existingItem =
      await this.cartItemsRepository.findByCartAndProduct(
        cart.id,
        dto.productId,
      );

    if (existingItem) {
      const newQuantity =
        existingItem.quantity + dto.quantity;

      if (newQuantity > product.stock) {
        throw new BadRequestException(
          `Not enough stock for product ${dto.productId}`,
        );
      }

      return this.cartItemsRepository.updateQuantity(
        existingItem.id,
        newQuantity,
      );
    }

    return this.cartItemsRepository.create({
      cartId: cart.id,
      productId: dto.productId,
      quantity: dto.quantity,
    });
  }

  async updateItem(
    userId: number,
    productId: number,
    dto: UpdateCartItemDto,
  ) {
    const cart =
      await this.cartRepository.findByUserId(userId);

    if (!cart) {
      throw new NotFoundException(
        'Cart not found.',
      );
    }

    const product =
      await this.productsRepository.findById(productId);

    if (!product) {
      throw new NotFoundException(
        `Product with id ${productId} not found`,
      );
    }

    if (dto.quantity > product.stock) {
      throw new BadRequestException(
        `Not enough stock for product ${productId}`,
      );
    }

    const item =
      await this.cartItemsRepository.findByCartAndProduct(
        cart.id,
        productId,
      );

    if (!item) {
      throw new NotFoundException(
        `Product ${productId} is not in the cart`,
      );
    }

    return this.cartItemsRepository.updateQuantity(
      item.id,
      dto.quantity,
    );
  }

  async removeItem(
    userId: number,
    productId: number,
  ): Promise<void> {
    const cart =
      await this.cartRepository.findByUserId(userId);

    if (!cart) {
      throw new NotFoundException(
        'Cart not found.',
      );
    }

    const removed =
      await this.cartItemsRepository.remove(
        cart.id,
        productId,
      );

    if (!removed) {
      throw new NotFoundException(
        `Product ${productId} is not in the cart`,
      );
    }
  }
}