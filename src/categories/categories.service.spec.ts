import { NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CategoriesService } from './categories.service';

describe('CategoriesService', () => {
  let service: CategoriesService;

  const categoriesRepository = {
    findAll: vi.fn(),
    findById: vi.fn(),
    findProductsByCategoryId: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    softDelete: vi.fn(),
    restore: vi.fn(),
  };

  const productsRepository = {
    findById: vi.fn(),
  };

  const productCategoriesRepository = {
    add: vi.fn(),
    remove: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new CategoriesService(
      categoriesRepository as any,
      productsRepository as any,
      productCategoriesRepository as any,
    );
  });

  it('should return all categories', async () => {
    const categories = [{ id: 1, name: 'GPU' }];
    categoriesRepository.findAll.mockResolvedValue(categories);

    await expect(service.findAll()).resolves.toEqual(categories);
    expect(categoriesRepository.findAll).toHaveBeenCalledOnce();
  });

  describe('findById', () => {
    it('should return the category when it exists', async () => {
      const category = { id: 1, name: 'GPU' };
      categoriesRepository.findById.mockResolvedValue(category);

      await expect(service.findById(1)).resolves.toEqual(category);
    });

    it('should throw NotFoundException when category does not exist', async () => {
      categoriesRepository.findById.mockResolvedValue(null);

      await expect(service.findById(999)).rejects.toThrow(
        new NotFoundException('Category with id 999 not found'),
      );
    });
  });

  describe('findProducts', () => {
    it('should return products for an existing category', async () => {
      const category = { id: 1, name: 'GPU' };
      const products = [{ id: 10, name: 'RTX 5070' }];
      categoriesRepository.findById.mockResolvedValue(category);
      categoriesRepository.findProductsByCategoryId.mockResolvedValue(products);

      await expect(service.findProducts(1)).resolves.toEqual(products);
      expect(categoriesRepository.findProductsByCategoryId).toHaveBeenCalledWith(1);
    });

    it('should throw when the category does not exist', async () => {
      categoriesRepository.findById.mockResolvedValue(null);

      await expect(service.findProducts(999)).rejects.toThrow(
        new NotFoundException('Category with id 999 not found'),
      );
      expect(categoriesRepository.findProductsByCategoryId).not.toHaveBeenCalled();
    });
  });

  describe('create', () => {
    it('should trim the category name', async () => {
      const category = { id: 1, name: 'GPU' };
      categoriesRepository.create.mockResolvedValue(category);

      await expect(service.create({ name: ' GPU ' })).resolves.toEqual(category);
      expect(categoriesRepository.create).toHaveBeenCalledWith({ name: 'GPU' });
    });
  });

  describe('update', () => {
    it('should trim the category name', async () => {
      categoriesRepository.update.mockResolvedValue({ id: 1, name: 'GPU' });

      await expect(service.update(1, { name: ' GPU ' })).resolves.toEqual({
        id: 1,
        name: 'GPU',
      });
      expect(categoriesRepository.update).toHaveBeenCalledWith(1, { name: 'GPU' });
    });

    it('should throw when the category does not exist', async () => {
      categoriesRepository.update.mockResolvedValue(null);

      await expect(service.update(999, { name: 'GPU' })).rejects.toThrow(
        new NotFoundException('Category with id 999 not found'),
      );
    });
  });

  describe('delete', () => {
    it('should soft delete the category', async () => {
      const category = { id: 1, name: 'GPU', deletedAt: new Date() };
      categoriesRepository.softDelete.mockResolvedValue(category);

      await expect(service.delete(1)).resolves.toEqual(category);
    });

    it('should throw when deletion finds no category', async () => {
      categoriesRepository.softDelete.mockResolvedValue(null);

      await expect(service.delete(999)).rejects.toThrow(
        new NotFoundException('Category with id 999 not found'),
      );
    });
  });

  describe('restore', () => {
    it('should restore the category', async () => {
      const category = { id: 1, name: 'GPU', deletedAt: null };
      categoriesRepository.restore.mockResolvedValue(category);

      await expect(service.restore(1)).resolves.toEqual(category);
    });

    it('should throw when restoration finds no category', async () => {
      categoriesRepository.restore.mockResolvedValue(null);

      await expect(service.restore(999)).rejects.toThrow(
        new NotFoundException('Category with id 999 not found'),
      );
    });
  });

  describe('addProduct', () => {
    it('should add a product to an existing category', async () => {
      categoriesRepository.findById.mockResolvedValue({ id: 1, name: 'GPU' });
      productsRepository.findById.mockResolvedValue({ id: 10, name: 'RTX 5070' });
      productCategoriesRepository.add.mockResolvedValue({
        categoryId: 1,
        productId: 10,
      });

      await expect(service.addProduct(1, 10)).resolves.toEqual({
        categoryId: 1,
        productId: 10,
      });

      expect(productCategoriesRepository.add).toHaveBeenCalledWith(1, 10);
    });

    it('should throw when the category does not exist', async () => {
      categoriesRepository.findById.mockResolvedValue(null);

      await expect(service.addProduct(999, 10)).rejects.toThrow(
        new NotFoundException('Category with id 999 not found'),
      );
      expect(productsRepository.findById).not.toHaveBeenCalled();
    });

    it('should throw when the product does not exist', async () => {
      categoriesRepository.findById.mockResolvedValue({ id: 1, name: 'GPU' });
      productsRepository.findById.mockResolvedValue(null);

      await expect(service.addProduct(1, 999)).rejects.toThrow(
        new NotFoundException('Product with id 999 not found'),
      );
      expect(productCategoriesRepository.add).not.toHaveBeenCalled();
    });
  });

  describe('removeProduct', () => {
    it('should remove an existing association', async () => {
      categoriesRepository.findById.mockResolvedValue({ id: 1, name: 'GPU' });
      productCategoriesRepository.remove.mockResolvedValue(true);

      await expect(service.removeProduct(1, 10)).resolves.toBeUndefined();
      expect(productCategoriesRepository.remove).toHaveBeenCalledWith(1, 10);
    });

    it('should throw when the category does not exist', async () => {
      categoriesRepository.findById.mockResolvedValue(null);

      await expect(service.removeProduct(999, 10)).rejects.toThrow(
        new NotFoundException('Category with id 999 not found'),
      );
      expect(productCategoriesRepository.remove).not.toHaveBeenCalled();
    });

    it('should throw when the association does not exist', async () => {
      categoriesRepository.findById.mockResolvedValue({ id: 1, name: 'GPU' });
      productCategoriesRepository.remove.mockResolvedValue(false);

      await expect(service.removeProduct(1, 999)).rejects.toThrow(
        new NotFoundException(
          'Product 999 is not associated with category 1',
        ),
      );
    });
  });
});
