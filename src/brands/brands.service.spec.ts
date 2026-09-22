import { NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BrandsService } from './brands.service';

describe('BrandsService', () => {
  let service: BrandsService;

  const brandsRepository = {
    findAll: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    softDelete: vi.fn(),
    restore: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    service = new BrandsService(
      brandsRepository as any,
    );
  });

  describe('findAll', () => {
    it('should return all brands', async () => {
      const brands = [
        {
          id: 1,
          name: 'NVIDIA',
        },
        {
          id: 2,
          name: 'AMD',
        },
      ];

      brandsRepository.findAll.mockResolvedValue(brands);

      const result = await service.findAll();

      expect(result).toEqual(brands);
      expect(brandsRepository.findAll).toHaveBeenCalledOnce();
      expect(brandsRepository.findAll).toHaveBeenCalledWith();
    });

    it('should return an empty array when there are no brands', async () => {
      brandsRepository.findAll.mockResolvedValue([]);

      const result = await service.findAll();

      expect(result).toEqual([]);
      expect(brandsRepository.findAll).toHaveBeenCalledOnce();
    });

    it('should propagate repository errors', async () => {
      const error = new Error('Database error');

      brandsRepository.findAll.mockRejectedValue(error);

      await expect(service.findAll()).rejects.toThrow(error);
      expect(brandsRepository.findAll).toHaveBeenCalledOnce();
    });
  });

  describe('findById', () => {
    it('should return the brand when it exists', async () => {
      const brand = {
        id: 1,
        name: 'NVIDIA',
      };

      brandsRepository.findById.mockResolvedValue(brand);

      const result = await service.findById(1);

      expect(result).toEqual(brand);
      expect(brandsRepository.findById).toHaveBeenCalledOnce();
      expect(brandsRepository.findById).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException when the brand does not exist', async () => {
      brandsRepository.findById.mockResolvedValue(null);

      await expect(service.findById(999)).rejects.toThrow(
        new NotFoundException('Brand with id 999 not found'),
      );

      expect(brandsRepository.findById).toHaveBeenCalledOnce();
      expect(brandsRepository.findById).toHaveBeenCalledWith(999);
    });

    it('should propagate repository errors', async () => {
      const error = new Error('Database error');

      brandsRepository.findById.mockRejectedValue(error);

      await expect(service.findById(1)).rejects.toThrow(error);
      expect(brandsRepository.findById).toHaveBeenCalledOnce();
    });
  });

  describe('create', () => {
    it('should trim the brand name and create the brand', async () => {
      const dto = {
        name: '  NVIDIA  ',
      };

      const createdBrand = {
        id: 1,
        name: 'NVIDIA',
      };

      brandsRepository.create.mockResolvedValue(createdBrand);

      const result = await service.create(dto);

      expect(result).toEqual(createdBrand);
      expect(brandsRepository.create).toHaveBeenCalledOnce();
      expect(brandsRepository.create).toHaveBeenCalledWith({
        name: 'NVIDIA',
      });
    });

    it('should propagate repository errors', async () => {
      const error = new Error('Database error');
      const dto = {
        name: '  NVIDIA  ',
      };

      brandsRepository.create.mockRejectedValue(error);

      await expect(service.create(dto)).rejects.toThrow(error);
      expect(brandsRepository.create).toHaveBeenCalledOnce();
      expect(brandsRepository.create).toHaveBeenCalledWith({
        name: 'NVIDIA',
      });
    });
  });

  describe('update', () => {
    it('should trim the brand name and update the brand', async () => {
      const dto = {
        name: '  NVIDIA Gaming  ',
      };

      const updatedBrand = {
        id: 1,
        name: 'NVIDIA Gaming',
      };

      brandsRepository.update.mockResolvedValue(updatedBrand);

      const result = await service.update(1, dto);

      expect(result).toEqual(updatedBrand);
      expect(brandsRepository.update).toHaveBeenCalledOnce();
      expect(brandsRepository.update).toHaveBeenCalledWith(1, {
        name: 'NVIDIA Gaming',
      });
    });

    it('should pass undefined when the update name is not provided', async () => {
      const dto = {};

      const updatedBrand = {
        id: 1,
        name: 'NVIDIA',
      };

      brandsRepository.update.mockResolvedValue(updatedBrand);

      const result = await service.update(1, dto);

      expect(result).toEqual(updatedBrand);
      expect(brandsRepository.update).toHaveBeenCalledOnce();
      expect(brandsRepository.update).toHaveBeenCalledWith(1, {
        name: undefined,
      });
    });

    it('should throw NotFoundException when the brand does not exist', async () => {
      const dto = {
        name: 'AMD',
      };

      brandsRepository.update.mockResolvedValue(null);

      await expect(
        service.update(999, dto),
      ).rejects.toThrow(
        new NotFoundException('Brand with id 999 not found'),
      );

      expect(brandsRepository.update).toHaveBeenCalledOnce();
      expect(brandsRepository.update).toHaveBeenCalledWith(999, {
        name: 'AMD',
      });
    });

    it('should propagate repository errors', async () => {
      const error = new Error('Database error');
      const dto = {
        name: 'AMD',
      };

      brandsRepository.update.mockRejectedValue(error);

      await expect(
        service.update(1, dto),
      ).rejects.toThrow(error);

      expect(brandsRepository.update).toHaveBeenCalledOnce();
      expect(brandsRepository.update).toHaveBeenCalledWith(1, {
        name: 'AMD',
      });
    });
  });

  describe('delete', () => {
    it('should soft delete and return the brand when it exists', async () => {
      const deletedBrand = {
        id: 1,
        name: 'NVIDIA',
        deletedAt: new Date(),
      };

      brandsRepository.softDelete.mockResolvedValue(deletedBrand);

      const result = await service.delete(1);

      expect(result).toEqual(deletedBrand);
      expect(brandsRepository.softDelete).toHaveBeenCalledOnce();
      expect(brandsRepository.softDelete).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException when the brand does not exist', async () => {
      brandsRepository.softDelete.mockResolvedValue(null);

      await expect(service.delete(999)).rejects.toThrow(
        new NotFoundException('Brand with id 999 not found'),
      );

      expect(brandsRepository.softDelete).toHaveBeenCalledOnce();
      expect(brandsRepository.softDelete).toHaveBeenCalledWith(999);
    });

    it('should propagate repository errors', async () => {
      const error = new Error('Database error');

      brandsRepository.softDelete.mockRejectedValue(error);

      await expect(service.delete(1)).rejects.toThrow(error);
      expect(brandsRepository.softDelete).toHaveBeenCalledOnce();
      expect(brandsRepository.softDelete).toHaveBeenCalledWith(1);
    });
  });

  describe('restore', () => {
    it('should restore and return the brand when it exists', async () => {
      const restoredBrand = {
        id: 1,
        name: 'NVIDIA',
        deletedAt: null,
      };

      brandsRepository.restore.mockResolvedValue(restoredBrand);

      const result = await service.restore(1);

      expect(result).toEqual(restoredBrand);
      expect(brandsRepository.restore).toHaveBeenCalledOnce();
      expect(brandsRepository.restore).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException when the brand does not exist', async () => {
      brandsRepository.restore.mockResolvedValue(null);

      await expect(service.restore(999)).rejects.toThrow(
        new NotFoundException('Brand with id 999 not found'),
      );

      expect(brandsRepository.restore).toHaveBeenCalledOnce();
      expect(brandsRepository.restore).toHaveBeenCalledWith(999);
    });

    it('should propagate repository errors', async () => {
      const error = new Error('Database error');

      brandsRepository.restore.mockRejectedValue(error);

      await expect(service.restore(1)).rejects.toThrow(error);
      expect(brandsRepository.restore).toHaveBeenCalledOnce();
      expect(brandsRepository.restore).toHaveBeenCalledWith(1);
    });
  });
});
