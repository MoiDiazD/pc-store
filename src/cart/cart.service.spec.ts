import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { DatabaseTransaction } from '../database/database.provider';
import { CartService } from './cart.service';

describe('CartService', () => {
  let service: CartService;

  const cartRepository = {
    findByUserId: vi.fn(),
    findByUserIdForUpdate: vi.fn(),
    create: vi.fn(),
  };

  const cartItemsRepository = {
    findDetailedByCartId: vi.fn(),
    findByCartAndProduct: vi.fn(),
    updateQuantity: vi.fn(),
    create: vi.fn(),
    remove: vi.fn(),
  };

  const productsRepository = {
    findById: vi.fn(),
  };

  const db = {
    transaction: vi.fn(),
  };

  const tx = {} as DatabaseTransaction;

  beforeEach(() => {
    vi.clearAllMocks();

    db.transaction.mockImplementation(
      async (
        callback: (tx: DatabaseTransaction) => Promise<unknown>,
      ) => callback(tx),
    );

    service = new CartService(
      cartRepository as any,
      cartItemsRepository as any,
      productsRepository as any,
      db as any,
    );
  });

  describe('getCart', () => {
    it('should return the existing cart with its detailed items', async () => {
      const cart = {
        id: 1,
        userId: 10,
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-02'),
      };

      const items = [
        {
          productId: 5,
          productName: 'RTX 5070',
          quantity: 2,
          unitPrice: '649.99',
        },
      ];

      cartRepository.findByUserId.mockResolvedValue(cart);
      cartItemsRepository.findDetailedByCartId.mockResolvedValue(items);

      const result = await service.getCart(10);

      expect(result).toEqual({
        id: cart.id,
        items,
        createdAt: cart.createdAt,
        updatedAt: cart.updatedAt,
      });

      expect(cartRepository.findByUserId).toHaveBeenCalledOnce();
      expect(cartRepository.findByUserId).toHaveBeenCalledWith(10);
      expect(cartRepository.create).not.toHaveBeenCalled();
      expect(
        cartItemsRepository.findDetailedByCartId,
      ).toHaveBeenCalledOnce();
      expect(
        cartItemsRepository.findDetailedByCartId,
      ).toHaveBeenCalledWith(cart.id);
    });

    it('should create a cart when the user does not have one', async () => {
      const cart = {
        id: 2,
        userId: 10,
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
      };

      cartRepository.findByUserId.mockResolvedValue(null);
      cartRepository.create.mockResolvedValue(cart);
      cartItemsRepository.findDetailedByCartId.mockResolvedValue([]);

      const result = await service.getCart(10);

      expect(result).toEqual({
        id: cart.id,
        items: [],
        createdAt: cart.createdAt,
        updatedAt: cart.updatedAt,
      });

      expect(cartRepository.findByUserId).toHaveBeenCalledWith(10);
      expect(cartRepository.create).toHaveBeenCalledOnce();
      expect(cartRepository.create).toHaveBeenCalledWith(10);
      expect(
        cartItemsRepository.findDetailedByCartId,
      ).toHaveBeenCalledWith(cart.id);
    });

    it('should propagate repository errors', async () => {
      const error = new Error('Database error');

      cartRepository.findByUserId.mockRejectedValue(error);

      await expect(service.getCart(10)).rejects.toThrow(error);
      expect(cartRepository.findByUserId).toHaveBeenCalledOnce();
      expect(cartRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('addItem', () => {
    it('should add a new item to the cart', async () => {
      const cart = {
        id: 1,
        userId: 10,
        checkoutLockedAt: null,
      };

      const product = {
        id: 5,
        name: 'RTX 5070',
        stock: 10,
        price: '649.99',
      };

      const dto = {
        productId: 5,
        quantity: 2,
      };

      const createdItem = {
        id: 20,
        cartId: 1,
        productId: 5,
        quantity: 2,
      };

      cartRepository.findByUserId.mockResolvedValue(cart);
      productsRepository.findById.mockResolvedValue(product);
      cartItemsRepository.findByCartAndProduct.mockResolvedValue(null);
      cartItemsRepository.create.mockResolvedValue(createdItem);

      const result = await service.addItem(10, dto);

      expect(result).toEqual(createdItem);
      expect(db.transaction).toHaveBeenCalledOnce();
      expect(cartRepository.findByUserId).toHaveBeenCalledWith(10, tx);
      expect(productsRepository.findById).toHaveBeenCalledWith(
        dto.productId,
        tx,
      );
      expect(
        cartItemsRepository.findByCartAndProduct,
      ).toHaveBeenCalledWith(cart.id, dto.productId, tx);
      expect(cartItemsRepository.create).toHaveBeenCalledWith(
        {
          cartId: cart.id,
          productId: dto.productId,
          quantity: dto.quantity,
        },
        tx,
      );
    });

    it('should update the existing item quantity when the product is already in the cart', async () => {
      const cart = {
        id: 1,
        userId: 10,
        checkoutLockedAt: null,
      };

      const product = {
        id: 5,
        name: 'RTX 5070',
        stock: 10,
      };

      const existingItem = {
        id: 20,
        cartId: 1,
        productId: 5,
        quantity: 3,
      };

      const dto = {
        productId: 5,
        quantity: 2,
      };

      const updatedItem = {
        ...existingItem,
        quantity: 5,
      };

      cartRepository.findByUserId.mockResolvedValue(cart);
      productsRepository.findById.mockResolvedValue(product);
      cartItemsRepository.findByCartAndProduct.mockResolvedValue(
        existingItem,
      );
      cartItemsRepository.updateQuantity.mockResolvedValue(
        updatedItem,
      );

      const result = await service.addItem(10, dto);

      expect(result).toEqual(updatedItem);
      expect(
        cartItemsRepository.updateQuantity,
      ).toHaveBeenCalledOnce();
      expect(
        cartItemsRepository.updateQuantity,
      ).toHaveBeenCalledWith(existingItem.id, 5, tx);
      expect(cartItemsRepository.create).not.toHaveBeenCalled();
    });

    it('should create a cart when the user does not have one', async () => {
      const cart = {
        id: 2,
        userId: 10,
        checkoutLockedAt: null,
      };

      cartRepository.findByUserId.mockResolvedValue(null);
      cartRepository.create.mockResolvedValue(cart);
      productsRepository.findById.mockResolvedValue({
        id: 5,
        stock: 10,
      });
      cartItemsRepository.findByCartAndProduct.mockResolvedValue(null);
      cartItemsRepository.create.mockResolvedValue({
        id: 20,
        cartId: 2,
        productId: 5,
        quantity: 2,
      });

      await service.addItem(10, {
        productId: 5,
        quantity: 2,
      });

      expect(cartRepository.create).toHaveBeenCalledWith(10, tx);
      expect(cartItemsRepository.create).toHaveBeenCalledWith(
        {
          cartId: cart.id,
          productId: 5,
          quantity: 2,
        },
        tx,
      );
    });

    it('should throw ConflictException when the cart is locked', async () => {
      const cart = {
        id: 1,
        userId: 10,
        checkoutLockedAt: new Date(),
      };

      cartRepository.findByUserId.mockResolvedValue(cart);

      await expect(
        service.addItem(10, {
          productId: 5,
          quantity: 2,
        }),
      ).rejects.toThrow(
        new ConflictException(
          'Cart is locked by a pending checkout.',
        ),
      );

      expect(productsRepository.findById).not.toHaveBeenCalled();
      expect(
        cartItemsRepository.findByCartAndProduct,
      ).not.toHaveBeenCalled();
      expect(cartItemsRepository.create).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when the product does not exist', async () => {
      const cart = {
        id: 1,
        userId: 10,
        checkoutLockedAt: null,
      };

      cartRepository.findByUserId.mockResolvedValue(cart);
      productsRepository.findById.mockResolvedValue(null);

      await expect(
        service.addItem(10, {
          productId: 999,
          quantity: 2,
        }),
      ).rejects.toThrow(
        new NotFoundException(
          'Product with id 999 not found',
        ),
      );

      expect(
        cartItemsRepository.findByCartAndProduct,
      ).not.toHaveBeenCalled();
      expect(cartItemsRepository.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when the requested quantity exceeds stock', async () => {
      const cart = {
        id: 1,
        userId: 10,
        checkoutLockedAt: null,
      };

      const product = {
        id: 5,
        stock: 3,
      };

      cartRepository.findByUserId.mockResolvedValue(cart);
      productsRepository.findById.mockResolvedValue(product);

      await expect(
        service.addItem(10, {
          productId: 5,
          quantity: 4,
        }),
      ).rejects.toThrow(
        new BadRequestException(
          'Not enough stock for product 5',
        ),
      );

      expect(
        cartItemsRepository.findByCartAndProduct,
      ).not.toHaveBeenCalled();
      expect(cartItemsRepository.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when the new quantity exceeds stock', async () => {
      const cart = {
        id: 1,
        userId: 10,
        checkoutLockedAt: null,
      };

      const product = {
        id: 5,
        stock: 5,
      };

      const existingItem = {
        id: 20,
        cartId: 1,
        productId: 5,
        quantity: 4,
      };

      cartRepository.findByUserId.mockResolvedValue(cart);
      productsRepository.findById.mockResolvedValue(product);
      cartItemsRepository.findByCartAndProduct.mockResolvedValue(
        existingItem,
      );

      await expect(
        service.addItem(10, {
          productId: 5,
          quantity: 2,
        }),
      ).rejects.toThrow(
        new BadRequestException(
          'Not enough stock for product 5',
        ),
      );

      expect(
        cartItemsRepository.updateQuantity,
      ).not.toHaveBeenCalled();
      expect(cartItemsRepository.create).not.toHaveBeenCalled();
    });

    it('should propagate repository errors', async () => {
      const error = new Error('Database error');
      const cart = {
        id: 1,
        userId: 10,
        checkoutLockedAt: null,
      };

      cartRepository.findByUserId.mockResolvedValue(cart);
      productsRepository.findById.mockRejectedValue(error);

      await expect(
        service.addItem(10, {
          productId: 5,
          quantity: 2,
        }),
      ).rejects.toThrow(error);

      expect(productsRepository.findById).toHaveBeenCalledWith(
        5,
        tx,
      );
      expect(
        cartItemsRepository.findByCartAndProduct,
      ).not.toHaveBeenCalled();
    });
  });

  describe('updateItem', () => {
    it('should update the quantity of an existing cart item', async () => {
      const cart = {
        id: 1,
        userId: 10,
        checkoutLockedAt: null,
      };

      const product = {
        id: 5,
        stock: 10,
      };

      const item = {
        id: 20,
        cartId: 1,
        productId: 5,
        quantity: 2,
      };

      const dto = {
        quantity: 5,
      };

      const updatedItem = {
        ...item,
        quantity: 5,
      };

      cartRepository.findByUserIdForUpdate.mockResolvedValue(cart);
      productsRepository.findById.mockResolvedValue(product);
      cartItemsRepository.findByCartAndProduct.mockResolvedValue(item);
      cartItemsRepository.updateQuantity.mockResolvedValue(updatedItem);

      const result = await service.updateItem(10, 5, dto);

      expect(result).toEqual(updatedItem);
      expect(
        cartRepository.findByUserIdForUpdate,
      ).toHaveBeenCalledWith(10, tx);
      expect(productsRepository.findById).toHaveBeenCalledWith(5, tx);
      expect(
        cartItemsRepository.findByCartAndProduct,
      ).toHaveBeenCalledWith(cart.id, 5, tx);
      expect(
        cartItemsRepository.updateQuantity,
      ).toHaveBeenCalledWith(item.id, dto.quantity, tx);
    });

    it('should throw NotFoundException when the cart does not exist', async () => {
      cartRepository.findByUserIdForUpdate.mockResolvedValue(null);

      await expect(
        service.updateItem(10, 5, { quantity: 2 }),
      ).rejects.toThrow(new NotFoundException('Cart not found.'));

      expect(productsRepository.findById).not.toHaveBeenCalled();
      expect(
        cartItemsRepository.findByCartAndProduct,
      ).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when the cart is locked', async () => {
      const cart = {
        id: 1,
        userId: 10,
        checkoutLockedAt: new Date(),
      };

      cartRepository.findByUserIdForUpdate.mockResolvedValue(cart);

      await expect(
        service.updateItem(10, 5, { quantity: 2 }),
      ).rejects.toThrow(
        new ConflictException(
          'Cart is locked by a pending checkout.',
        ),
      );

      expect(productsRepository.findById).not.toHaveBeenCalled();
      expect(
        cartItemsRepository.findByCartAndProduct,
      ).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when the product does not exist', async () => {
      const cart = {
        id: 1,
        userId: 10,
        checkoutLockedAt: null,
      };

      cartRepository.findByUserIdForUpdate.mockResolvedValue(cart);
      productsRepository.findById.mockResolvedValue(null);

      await expect(
        service.updateItem(10, 999, { quantity: 2 }),
      ).rejects.toThrow(
        new NotFoundException(
          'Product with id 999 not found',
        ),
      );

      expect(
        cartItemsRepository.findByCartAndProduct,
      ).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when the requested quantity exceeds stock', async () => {
      const cart = {
        id: 1,
        userId: 10,
        checkoutLockedAt: null,
      };

      const product = {
        id: 5,
        stock: 3,
      };

      cartRepository.findByUserIdForUpdate.mockResolvedValue(cart);
      productsRepository.findById.mockResolvedValue(product);

      await expect(
        service.updateItem(10, 5, { quantity: 4 }),
      ).rejects.toThrow(
        new BadRequestException(
          'Not enough stock for product 5',
        ),
      );

      expect(
        cartItemsRepository.findByCartAndProduct,
      ).not.toHaveBeenCalled();
      expect(
        cartItemsRepository.updateQuantity,
      ).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when the product is not in the cart', async () => {
      const cart = {
        id: 1,
        userId: 10,
        checkoutLockedAt: null,
      };

      const product = {
        id: 5,
        stock: 10,
      };

      cartRepository.findByUserIdForUpdate.mockResolvedValue(cart);
      productsRepository.findById.mockResolvedValue(product);
      cartItemsRepository.findByCartAndProduct.mockResolvedValue(null);

      await expect(
        service.updateItem(10, 5, { quantity: 2 }),
      ).rejects.toThrow(
        new NotFoundException(
          'Product 5 is not in the cart',
        ),
      );

      expect(
        cartItemsRepository.updateQuantity,
      ).not.toHaveBeenCalled();
    });

    it('should propagate repository errors', async () => {
      const error = new Error('Database error');
      const cart = {
        id: 1,
        userId: 10,
        checkoutLockedAt: null,
      };

      cartRepository.findByUserIdForUpdate.mockResolvedValue(cart);
      productsRepository.findById.mockRejectedValue(error);

      await expect(
        service.updateItem(10, 5, { quantity: 2 }),
      ).rejects.toThrow(error);

      expect(productsRepository.findById).toHaveBeenCalledWith(
        5,
        tx,
      );
    });
  });

  describe('removeItem', () => {
    it('should remove the cart item successfully', async () => {
      const cart = {
        id: 1,
        userId: 10,
        checkoutLockedAt: null,
      };

      cartRepository.findByUserIdForUpdate.mockResolvedValue(cart);
      cartItemsRepository.remove.mockResolvedValue(true);

      await expect(service.removeItem(10, 5)).resolves.toBeUndefined();

      expect(
        cartRepository.findByUserIdForUpdate,
      ).toHaveBeenCalledWith(10, tx);
      expect(cartItemsRepository.remove).toHaveBeenCalledOnce();
      expect(cartItemsRepository.remove).toHaveBeenCalledWith(
        cart.id,
        5,
        tx,
      );
    });

    it('should throw NotFoundException when the cart does not exist', async () => {
      cartRepository.findByUserIdForUpdate.mockResolvedValue(null);

      await expect(
        service.removeItem(10, 5),
      ).rejects.toThrow(new NotFoundException('Cart not found.'));

      expect(cartItemsRepository.remove).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when the cart is locked', async () => {
      const cart = {
        id: 1,
        userId: 10,
        checkoutLockedAt: new Date(),
      };

      cartRepository.findByUserIdForUpdate.mockResolvedValue(cart);

      await expect(
        service.removeItem(10, 5),
      ).rejects.toThrow(
        new ConflictException(
          'Cart is locked by a pending checkout.',
        ),
      );

      expect(cartItemsRepository.remove).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when the product is not in the cart', async () => {
      const cart = {
        id: 1,
        userId: 10,
        checkoutLockedAt: null,
      };

      cartRepository.findByUserIdForUpdate.mockResolvedValue(cart);
      cartItemsRepository.remove.mockResolvedValue(false);

      await expect(
        service.removeItem(10, 5),
      ).rejects.toThrow(
        new NotFoundException(
          'Product 5 is not in the cart',
        ),
      );

      expect(cartItemsRepository.remove).toHaveBeenCalledWith(
        cart.id,
        5,
        tx,
      );
    });

    it('should propagate repository errors', async () => {
      const error = new Error('Database error');
      const cart = {
        id: 1,
        userId: 10,
        checkoutLockedAt: null,
      };

      cartRepository.findByUserIdForUpdate.mockResolvedValue(cart);
      cartItemsRepository.remove.mockRejectedValue(error);

      await expect(
        service.removeItem(10, 5),
      ).rejects.toThrow(error);

      expect(cartItemsRepository.remove).toHaveBeenCalledWith(
        cart.id,
        5,
        tx,
      );
    });
  });
});
