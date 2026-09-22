import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';
import { createHash } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;

  const usersRepository = {
    findByEmail: vi.fn(),
    create: vi.fn(),
    findById: vi.fn(),
    updatePassword: vi.fn(),
  };

  const sessionsRepository = {
    create: vi.fn(),
    revoke: vi.fn(),
    revokeAllForUser: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AuthService(
      usersRepository as any,
      sessionsRepository as any,
    );
  });

  describe('register', () => {
    it('should normalize the email and name and create a customer', async () => {
      usersRepository.findByEmail.mockResolvedValue(null);

      const createdUser = {
        id: 1,
        name: 'Moi Diaz',
        email: 'moi@example.com',
        role: 'customer',
        passwordHash: 'hash',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      usersRepository.create.mockResolvedValue(createdUser);

      const result = await service.register({
        name: '  Moi Diaz  ',
        email: '  MOI@EXAMPLE.COM ',
        password: 'password123',
      });

      expect(result).toEqual({
        id: createdUser.id,
        name: createdUser.name,
        email: createdUser.email,
        role: createdUser.role,
        createdAt: createdUser.createdAt,
        updatedAt: createdUser.updatedAt,
      });
      expect(usersRepository.findByEmail).toHaveBeenCalledWith(
        'moi@example.com',
      );
      expect(usersRepository.create).toHaveBeenCalledOnce();
      expect(usersRepository.create.mock.calls[0][0]).toMatchObject({
        name: 'Moi Diaz',
        email: 'moi@example.com',
        role: 'customer',
      });
      expect(usersRepository.create.mock.calls[0][0].passwordHash).toMatch(
        /^\$argon2id\$/,
      );
    });

    it('should throw ConflictException when the email already exists', async () => {
      usersRepository.findByEmail.mockResolvedValue({
        id: 1,
        email: 'moi@example.com',
      });

      await expect(
        service.register({
          name: 'Moi',
          email: 'MOI@EXAMPLE.COM',
          password: 'password123',
        }),
      ).rejects.toThrow(
        new ConflictException('A user with this email already exists.'),
      );

      expect(usersRepository.create).not.toHaveBeenCalled();
    });

    it('should propagate repository errors while checking the email', async () => {
      const error = new Error('Database error');
      usersRepository.findByEmail.mockRejectedValue(error);

      await expect(
        service.register({
          name: 'Moi',
          email: 'moi@example.com',
          password: 'password123',
        }),
      ).rejects.toThrow(error);

      expect(usersRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('should reject unknown users', async () => {
      usersRepository.findByEmail.mockResolvedValue(null);

      await expect(
        service.login({
          email: ' MOI@EXAMPLE.COM ',
          password: 'password123',
        }),
      ).rejects.toThrow(new UnauthorizedException('Invalid credentials.'));

      expect(usersRepository.findByEmail).toHaveBeenCalledWith(
        'moi@example.com',
      );
      expect(sessionsRepository.create).not.toHaveBeenCalled();
    });

    it('should reject an invalid password', async () => {
      const passwordHash = await argon2.hash('correct-password', {
        type: argon2.argon2id,
      });

      usersRepository.findByEmail.mockResolvedValue({
        id: 1,
        name: 'Moi',
        email: 'moi@example.com',
        role: 'customer',
        passwordHash,
      });

      await expect(
        service.login({
          email: 'moi@example.com',
          password: 'wrong-password',
        }),
      ).rejects.toThrow(new UnauthorizedException('Invalid credentials.'));

      expect(sessionsRepository.create).not.toHaveBeenCalled();
    });

    it('should create a session and return the raw session token', async () => {
      const passwordHash = await argon2.hash('password123', {
        type: argon2.argon2id,
      });

      const user = {
        id: 7,
        name: 'Moi',
        email: 'moi@example.com',
        role: 'customer',
        passwordHash,
      };

      usersRepository.findByEmail.mockResolvedValue(user);
      sessionsRepository.create.mockResolvedValue({
        id: 'session-hash',
        userId: user.id,
      });

      const result = await service.login({
        email: ' MOI@EXAMPLE.COM ',
        password: 'password123',
      });

      expect(result.sessionToken).toMatch(/^[a-f0-9]{64}$/);
      expect(result.user).toEqual({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      });

      expect(sessionsRepository.create).toHaveBeenCalledOnce();

      const session = sessionsRepository.create.mock.calls[0][0];
      expect(session.userId).toBe(user.id);
      expect(session.id).toBe(
        createHash('sha256')
          .update(result.sessionToken)
          .digest('hex'),
      );
      expect(session.expiresAt).toBeInstanceOf(Date);
      expect(session.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('should propagate session creation errors', async () => {
      const passwordHash = await argon2.hash('password123', {
        type: argon2.argon2id,
      });
      usersRepository.findByEmail.mockResolvedValue({
        id: 1,
        name: 'Moi',
        email: 'moi@example.com',
        role: 'customer',
        passwordHash,
      });

      const error = new Error('Session database error');
      sessionsRepository.create.mockRejectedValue(error);

      await expect(
        service.login({
          email: 'moi@example.com',
          password: 'password123',
        }),
      ).rejects.toThrow(error);
    });
  });

  describe('logout', () => {
    it('should hash the session token and revoke the session', async () => {
      sessionsRepository.revoke.mockResolvedValue(undefined);

      await service.logout('raw-session-token');

      expect(sessionsRepository.revoke).toHaveBeenCalledWith(
        createHash('sha256')
          .update('raw-session-token')
          .digest('hex'),
      );
    });

    it('should propagate repository errors', async () => {
      const error = new Error('Database error');
      sessionsRepository.revoke.mockRejectedValue(error);

      await expect(service.logout('token')).rejects.toThrow(error);
    });
  });

  describe('changePassword', () => {
    it('should reject when the user no longer exists', async () => {
      usersRepository.findById.mockResolvedValue(null);

      await expect(
        service.changePassword(999, {
          currentPassword: 'old',
          newPassword: 'new-password',
        }),
      ).rejects.toThrow(
        new UnauthorizedException('User is no longer available.'),
      );

      expect(usersRepository.updatePassword).not.toHaveBeenCalled();
      expect(sessionsRepository.revokeAllForUser).not.toHaveBeenCalled();
    });

    it('should reject when the current password is incorrect', async () => {
      const passwordHash = await argon2.hash('correct-password', {
        type: argon2.argon2id,
      });

      usersRepository.findById.mockResolvedValue({
        id: 1,
        passwordHash,
      });

      await expect(
        service.changePassword(1, {
          currentPassword: 'wrong-password',
          newPassword: 'new-password',
        }),
      ).rejects.toThrow(
        new UnauthorizedException('Current password is incorrect.'),
      );

      expect(usersRepository.updatePassword).not.toHaveBeenCalled();
      expect(sessionsRepository.revokeAllForUser).not.toHaveBeenCalled();
    });

    it('should update the password and revoke all sessions', async () => {
      const oldHash = await argon2.hash('old-password', {
        type: argon2.argon2id,
      });

      usersRepository.findById.mockResolvedValue({
        id: 1,
        passwordHash: oldHash,
      });

      await service.changePassword(1, {
        currentPassword: 'old-password',
        newPassword: 'new-password',
      });

      expect(usersRepository.updatePassword).toHaveBeenCalledOnce();
      const newHash = usersRepository.updatePassword.mock.calls[0][1];

      expect(newHash).toMatch(/^\$argon2id\$/);
      expect(await argon2.verify(newHash, 'new-password')).toBe(true);
      expect(await argon2.verify(newHash, 'old-password')).toBe(false);

      expect(sessionsRepository.revokeAllForUser).toHaveBeenCalledWith(1);
    });

    it('should propagate password update errors', async () => {
      const passwordHash = await argon2.hash('old-password', {
        type: argon2.argon2id,
      });

      usersRepository.findById.mockResolvedValue({
        id: 1,
        passwordHash,
      });

      const error = new Error('Database error');
      usersRepository.updatePassword.mockRejectedValue(error);

      await expect(
        service.changePassword(1, {
          currentPassword: 'old-password',
          newPassword: 'new-password',
        }),
      ).rejects.toThrow(error);

      expect(sessionsRepository.revokeAllForUser).not.toHaveBeenCalled();
    });
  });
});
