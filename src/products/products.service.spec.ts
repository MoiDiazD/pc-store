import { NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ProductsService } from './products.service';

describe('ProductsService', () => {
  let service: ProductsService;

  const productsRepository = {
    findAll: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    softDelete: vi.fn(),
    restore: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    service = new ProductsService(
      productsRepository as any,
    );
  });

  describe('findAll', () => {
    it('should return all products', async () => {
      const products = [
        {
          id: 1,
          name: 'RTX 5070',
          model: 'RTX 5070',
          price: '649.99',
          stock: 10,
        },
        {
          id: 2,
          name: 'RX 9070',
          model: 'RX 9070',
          price: '699.99',
          stock: 5,
        },
      ];

      productsRepository.findAll.mockResolvedValue(products);

      const result = await service.findAll();

      expect(result).toEqual(products);
      expect(productsRepository.findAll).toHaveBeenCalledOnce();
      expect(productsRepository.findAll).toHaveBeenCalledWith();
    });

    it('should return an empty array when there are no products', async () => {
      productsRepository.findAll.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
      expect(productsRepository.findAll).toHaveBeenCalledOnce();
    });

    it('should propagate repository errors', async () => {
      const error = new Error('Database error');

      productsRepository.findAll.mockRejectedValue(error);

      await expect(service.findAll()).rejects.toThrow(error);
      expect(productsRepository.findAll).toHaveBeenCalledOnce();
    });
  });

  describe('findById', () => {
    it('should return the product when it exists', async () => {
      const product = {
        id: 1,
        name: 'RTX 5070',
        model: 'RTX 5070',
        price: '649.99',
        stock: 10,
      };

      productsRepository.findById.mockResolvedValue(product);

      const result = await service.findById(1);

      expect(result).toEqual(product);
      expect(productsRepository.findById).toHaveBeenCalledOnce();
      expect(productsRepository.findById).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException when the product does not exist', async () => {
      productsRepository.findById.mockResolvedValue(null);

      await expect(service.findById(999)).rejects.toThrow(
        new NotFoundException('Product with id 999 not found'),
      );

      expect(productsRepository.findById).toHaveBeenCalledOnce();
      expect(productsRepository.findById).toHaveBeenCalledWith(999);
    });

    it('should propagate repository errors', async () => {
      const error = new Error('Database error');

      productsRepository.findById.mockRejectedValue(error);

      await expect(service.findById(1)).rejects.toThrow(error);
      expect(productsRepository.findById).toHaveBeenCalledOnce();
    });
  });

  describe('create', () => {
    it('should create and return the product', async () => {
      const product = {
        name: 'RTX 5070',
        model: 'RTX 5070',
        description: 'NVIDIA graphics card',
        price: '649.99',
        stock: 10,
        brandId: 1,
      };

      const createdProduct = {
        id: 1,
        ...product,
      };

      productsRepository.create.mockResolvedValue(createdProduct);

      const result = await service.create(product);

      expect(result).toEqual(createdProduct);
      expect(productsRepository.create).toHaveBeenCalledOnce();
      expect(productsRepository.create).toHaveBeenCalledWith(product);
    });

    it('should propagate repository errors', async () => {
      const error = new Error('Database error');

      const product = {
        name: 'RTX 5070',
        model: 'RTX 5070',
        description: 'NVIDIA graphics card',
        price: '649.99',
        stock: 10,
        brandId: 1,
      };

      productsRepository.create.mockRejectedValue(error);

      await expect(service.create(product)).rejects.toThrow(error);
      expect(productsRepository.create).toHaveBeenCalledOnce();
      expect(productsRepository.create).toHaveBeenCalledWith(product);
    });
  });

  describe('update', () => {
    it('should update and return the product when it exists', async () => {
      const updateData = {
        name: 'RTX 5070 Super',
        price: '699.99',
      };

      const updatedProduct = {
        id: 1,
        name: 'RTX 5070 Super',
        model: 'RTX 5070',
        price: '699.99',
        stock: 10,
        brandId: 1,
      };

      productsRepository.update.mockResolvedValue(updatedProduct);

      const result = await service.update(1, updateData);

      expect(result).toEqual(updatedProduct);
      expect(productsRepository.update).toHaveBeenCalledOnce();
      expect(productsRepository.update).toHaveBeenCalledWith(
        1,
        updateData,
      );
    });

    it('should throw NotFoundException when the product does not exist', async () => {
      const updateData = {
        name: 'RTX 5070 Super',
      };

      productsRepository.update.mockResolvedValue(null);

      await expect(
        service.update(999, updateData),
      ).rejects.toThrow(
        new NotFoundException('Product with id 999 not found'),
      );

      expect(productsRepository.update).toHaveBeenCalledOnce();
      expect(productsRepository.update).toHaveBeenCalledWith(
        999,
        updateData,
      );
    });

    it('should propagate repository errors', async () => {
      const error = new Error('Database error');
      const updateData = {
        name: 'RTX 5070 Super',
      };

      productsRepository.update.mockRejectedValue(error);

      await expect(
        service.update(1, updateData),
      ).rejects.toThrow(error);

      expect(productsRepository.update).toHaveBeenCalledOnce();
      expect(productsRepository.update).toHaveBeenCalledWith(
        1,
        updateData,
      );
    });
  });

  describe('delete', () => {
    it('should soft delete and return the product when it exists', async () => {
      const deletedProduct = {
        id: 1,
        name: 'RTX 5070',
        model: 'RTX 5070',
        price: '649.99',
        stock: 10,
        deletedAt: new Date(),
      };

      productsRepository.softDelete.mockResolvedValue(deletedProduct);

      const result = await service.delete(1);

      expect(result).toEqual(deletedProduct);
      expect(productsRepository.softDelete).toHaveBeenCalledOnce();
      expect(productsRepository.softDelete).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException when the product does not exist', async () => {
      productsRepository.softDelete.mockResolvedValue(null);

      await expect(service.delete(999)).rejects.toThrow(
        new NotFoundException('Product with id 999 not found'),
      );

      expect(productsRepository.softDelete).toHaveBeenCalledOnce();
      expect(productsRepository.softDelete).toHaveBeenCalledWith(999);
    });

    it('should propagate repository errors', async () => {
      const error = new Error('Database error');

      productsRepository.softDelete.mockRejectedValue(error);

      await expect(service.delete(1)).rejects.toThrow(error);
      expect(productsRepository.softDelete).toHaveBeenCalledOnce();
      expect(productsRepository.softDelete).toHaveBeenCalledWith(1);
    });
  });

  describe('restore', () => {
    it('should restore and return the product when it exists', async () => {
      const restoredProduct = {
        id: 1,
        name: 'RTX 5070',
        model: 'RTX 5070',
        price: '649.99',
        stock: 10,
        deletedAt: null,
      };

      productsRepository.restore.mockResolvedValue(restoredProduct);

      const result = await service.restore(1);

      expect(result).toEqual(restoredProduct);
      expect(productsRepository.restore).toHaveBeenCalledOnce();
      expect(productsRepository.restore).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException when the product does not exist', async () => {
      productsRepository.restore.mockResolvedValue(null);

      await expect(service.restore(999)).rejects.toThrow(
        new NotFoundException('Product with id 999 not found'),
      );

      expect(productsRepository.restore).toHaveBeenCalledOnce();
      expect(productsRepository.restore).toHaveBeenCalledWith(999);
    });

    it('should propagate repository errors', async () => {
      const error = new Error('Database error');

      productsRepository.restore.mockRejectedValue(error);

      await expect(service.restore(1)).rejects.toThrow(error);
      expect(productsRepository.restore).toHaveBeenCalledOnce();
      expect(productsRepository.restore).toHaveBeenCalledWith(1);
    });
  });
});
