import { NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;

  const usersRepository = {
    findAll: vi.fn(),
    findById: vi.fn(),
    softDelete: vi.fn(),
    restore: vi.fn(),
    update: vi.fn(),
    updateRole: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new UsersService(usersRepository as any);
  });

  it('should return all users', async () => {
    const users = [{ id: 1, name: 'Moi', email: 'moi@example.com' }];
    usersRepository.findAll.mockResolvedValue(users);

    await expect(service.findAll()).resolves.toEqual(users);
    expect(usersRepository.findAll).toHaveBeenCalledOnce();
  });

  describe('findById', () => {
    it('should return a public user without sensitive fields', async () => {
      const user = {
        id: 1,
        name: 'Moi',
        email: 'moi@example.com',
        role: 'customer',
        passwordHash: 'secret',
        deletedAt: null,
      };
      usersRepository.findById.mockResolvedValue(user);

      await expect(service.findById(1)).resolves.toEqual({
        id: 1,
        name: 'Moi',
        email: 'moi@example.com',
        role: 'customer',
      });
    });

    it('should throw NotFoundException when the user does not exist', async () => {
      usersRepository.findById.mockResolvedValue(null);

      await expect(service.findById(999)).rejects.toThrow(
        new NotFoundException('User with id 999 not found'),
      );
    });
  });

  describe('delete', () => {
    it('should soft delete an existing user', async () => {
      const user = { id: 1, name: 'Moi', deletedAt: new Date() };
      usersRepository.softDelete.mockResolvedValue(user);

      await expect(service.delete(1)).resolves.toEqual(user);
      expect(usersRepository.softDelete).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException when deletion finds no user', async () => {
      usersRepository.softDelete.mockResolvedValue(null);

      await expect(service.delete(999)).rejects.toThrow(
        new NotFoundException('User with id 999 not found'),
      );
    });
  });

  describe('restore', () => {
    it('should restore an existing user', async () => {
      const user = { id: 1, name: 'Moi', deletedAt: null };
      usersRepository.restore.mockResolvedValue(user);

      await expect(service.restore(1)).resolves.toEqual(user);
      expect(usersRepository.restore).toHaveBeenCalledWith(1);
    });

    it('should throw NotFoundException when restoration finds no user', async () => {
      usersRepository.restore.mockResolvedValue(null);

      await expect(service.restore(999)).rejects.toThrow(
        new NotFoundException('User with id 999 not found'),
      );
    });
  });

  describe('update', () => {
    it('should normalize name and email before updating', async () => {
      const user = {
        id: 1,
        name: 'Moi Diaz',
        email: 'moi@example.com',
        role: 'customer',
        passwordHash: 'secret',
        deletedAt: null,
      };
      usersRepository.update.mockResolvedValue(user);

      await expect(
        service.update(1, {
          name: '  Moi Diaz  ',
          email: ' MOI@EXAMPLE.COM ',
        }),
      ).resolves.toEqual({
        id: 1,
        name: 'Moi Diaz',
        email: 'moi@example.com',
        role: 'customer',
      });

      expect(usersRepository.update).toHaveBeenCalledWith(1, {
        name: 'Moi Diaz',
        email: 'moi@example.com',
      });
    });

    it('should pass undefined optional fields through normalization', async () => {
      usersRepository.update.mockResolvedValue({
        id: 1,
        name: 'Moi',
        email: 'moi@example.com',
        role: 'customer',
        passwordHash: 'secret',
        deletedAt: null,
      });

      await service.update(1, {});
      expect(usersRepository.update).toHaveBeenCalledWith(1, {
        name: undefined,
        email: undefined,
      });
    });

    it('should throw NotFoundException when update finds no user', async () => {
      usersRepository.update.mockResolvedValue(null);

      await expect(service.update(999, { name: 'Moi' })).rejects.toThrow(
        new NotFoundException('User with id 999 not found'),
      );
    });
  });

  describe('updateAdmin', () => {
    it('should normalize admin update data', async () => {
      usersRepository.update.mockResolvedValue({
        id: 1,
        name: 'Admin User',
        email: 'admin@example.com',
        role: 'manager',
        passwordHash: 'secret',
        deletedAt: null,
      });

      await expect(
        service.updateAdmin(1, {
          name: ' Admin User ',
          email: ' ADMIN@EXAMPLE.COM ',
          role: 'manager',
        }),
      ).resolves.toEqual({
        id: 1,
        name: 'Admin User',
        email: 'admin@example.com',
        role: 'manager',
      });

      expect(usersRepository.update).toHaveBeenCalledWith(1, {
        name: 'Admin User',
        email: 'admin@example.com',
        role: 'manager',
      });
    });

    it('should throw NotFoundException when admin update finds no user', async () => {
      usersRepository.update.mockResolvedValue(null);

      await expect(
        service.updateAdmin(999, { name: 'Admin' }),
      ).rejects.toThrow(
        new NotFoundException('User with id 999 not found'),
      );
    });
  });

  describe('updateRole', () => {
    it('should update the role and return a public user', async () => {
      usersRepository.updateRole.mockResolvedValue({
        id: 1,
        name: 'Moi',
        email: 'moi@example.com',
        role: 'worker',
        passwordHash: 'secret',
        deletedAt: null,
      });

      await expect(service.updateRole(1, 'worker')).resolves.toEqual({
        id: 1,
        name: 'Moi',
        email: 'moi@example.com',
        role: 'worker',
      });

      expect(usersRepository.updateRole).toHaveBeenCalledWith(1, 'worker');
    });

    it('should throw NotFoundException when role update finds no user', async () => {
      usersRepository.updateRole.mockResolvedValue(null);

      await expect(service.updateRole(999, 'worker')).rejects.toThrow(
        new NotFoundException('User with id 999 not found'),
      );
    });
  });
});
