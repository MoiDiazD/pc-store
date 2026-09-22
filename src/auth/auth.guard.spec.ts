import { UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { createHash } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthGuard } from './auth.guard';
import { SESSION_COOKIE_NAME } from './auth.constants';

describe('AuthGuard', () => {
  const sessionsRepository = { findValidByTokenHash: vi.fn() };
  const usersRepository = { findById: vi.fn() };
  const reflector = { getAllAndOverride: vi.fn() };
  let guard: AuthGuard;

  beforeEach(() => {
    vi.clearAllMocks();
    guard = new AuthGuard(
      sessionsRepository as any,
      usersRepository as any,
      reflector as unknown as Reflector,
    );
  });

  const context = (cookies: Record<string, string> = {}) => {
    const request: any = { cookies };
    return {
      getHandler: vi.fn(),
      getClass: vi.fn(),
      switchToHttp: () => ({ getRequest: () => request }),
      request,
    } as any;
  };

  it('should allow public routes without checking authentication', async () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    const ctx = context();
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(sessionsRepository.findValidByTokenHash).not.toHaveBeenCalled();
  });

  it('should reject requests without a session cookie', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    await expect(guard.canActivate(context())).rejects.toThrow(
      new UnauthorizedException('Authentication required.'),
    );
  });

  it('should reject invalid or expired sessions', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    sessionsRepository.findValidByTokenHash.mockResolvedValue(null);

    await expect(
      guard.canActivate(context({ [SESSION_COOKIE_NAME]: 'token' })),
    ).rejects.toThrow(
      new UnauthorizedException('Invalid or expired session.'),
    );

    expect(sessionsRepository.findValidByTokenHash).toHaveBeenCalledWith(
      createHash('sha256').update('token').digest('hex'),
    );
  });

  it('should reject sessions whose user no longer exists', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    sessionsRepository.findValidByTokenHash.mockResolvedValue({
      userId: 7,
    });
    usersRepository.findById.mockResolvedValue(null);

    await expect(
      guard.canActivate(context({ [SESSION_COOKIE_NAME]: 'token' })),
    ).rejects.toThrow(
      new UnauthorizedException('User is no longer available.'),
    );
  });

  it('should attach the authenticated user to the request', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    sessionsRepository.findValidByTokenHash.mockResolvedValue({ userId: 7 });
    const user = { id: 7, role: 'customer' };
    usersRepository.findById.mockResolvedValue(user);

    const ctx = context({ [SESSION_COOKIE_NAME]: 'token' });

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(ctx.request.user).toBe(user);
  });

  it('should propagate repository errors', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    const error = new Error('Database error');
    sessionsRepository.findValidByTokenHash.mockRejectedValue(error);

    await expect(
      guard.canActivate(context({ [SESSION_COOKIE_NAME]: 'token' })),
    ).rejects.toThrow(error);
  });
});
