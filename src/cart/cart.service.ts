import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { DATABASE } from '../database/database.provider';
import type {
  Database,
  DatabaseTransaction,
} from '../database/database.provider';
import { ProductsRepository } from '../products/products.repository';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { CartItemsRepository } from './cart-items.repository';
import { CartRepository } from './cart.repository';

@Injectable()
export class CartService {
  constructor(
    private readonly cartRepository: CartRepository,
    private readonly cartItemsRepository: CartItemsRepository,
    private readonly productsRepository: ProductsRepository,

    @Inject(DATABASE)
    private readonly db: Database,
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

  private async getUnlockedCartForUpdate(
    userId: number,
    tx: DatabaseTransaction,
  ) {
    const cart = await this.cartRepository.findByUserIdForUpdate(
      userId,
      tx,
    );

    if (!cart) {
      throw new NotFoundException('Cart not found.');
    }

    if (cart.checkoutLockedAt) {
      throw new ConflictException(
        'Cart is locked by a pending checkout.',
      );
    }

    return cart;
  }

  async addItem(userId: number, dto: AddCartItemDto) {
    return this.db.transaction(async (tx) => {
      let cart = await this.cartRepository.findByUserId(userId, tx);

      if (!cart) {
        cart = await this.cartRepository.create(userId, tx);
      } else if (cart.checkoutLockedAt) {
        throw new ConflictException(
          'Cart is locked by a pending checkout.',
        );
      }

      const product = await this.productsRepository.findById(
        dto.productId,
        tx,
      );

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
          tx,
        );

      if (existingItem) {
        const newQuantity = existingItem.quantity + dto.quantity;

        if (newQuantity > product.stock) {
          throw new BadRequestException(
            `Not enough stock for product ${dto.productId}`,
          );
        }

        return this.cartItemsRepository.updateQuantity(
          existingItem.id,
          newQuantity,
          tx,
        );
      }

      return this.cartItemsRepository.create(
        {
          cartId: cart.id,
          productId: dto.productId,
          quantity: dto.quantity,
        },
        tx,
      );
    });
  }

  async updateItem(
    userId: number,
    productId: number,
    dto: UpdateCartItemDto,
  ) {
    return this.db.transaction(async (tx) => {
      const cart = await this.getUnlockedCartForUpdate(userId, tx);

      if (!cart) {
        throw new NotFoundException('Cart not found.');
      }

      const product = await this.productsRepository.findById(productId, tx);

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

      const item = await this.cartItemsRepository.findByCartAndProduct(
        cart.id,
        productId,
        tx,
      );

      if (!item) {
        throw new NotFoundException(
          `Product ${productId} is not in the cart`,
        );
      }

      return this.cartItemsRepository.updateQuantity(
        item.id,
        dto.quantity,
        tx,
      );
    });
  }

  async removeItem(
    userId: number,
    productId: number,
  ): Promise<void> {
    return this.db.transaction(async (tx) => {
      const cart = await this.getUnlockedCartForUpdate(userId, tx);

      if (!cart) {
        throw new NotFoundException('Cart not found.');
      }

      const removed = await this.cartItemsRepository.remove(
        cart.id,
        productId,
        tx,
      );

      if (!removed) {
        throw new NotFoundException(
          `Product ${productId} is not in the cart`,
        );
      }
    });
  }
}
