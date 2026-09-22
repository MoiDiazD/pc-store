import { ForbiddenException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RoleGuard } from './roles.guard';
import { ROLES_KEY } from './roles.decorator';

describe('RoleGuard', () => {
  const reflector = { getAllAndOverride: vi.fn() };
  let guard: RoleGuard;

  beforeEach(() => {
    vi.clearAllMocks();
    guard = new RoleGuard(reflector as any);
  });

  const context = (user?: any) => ({
    getHandler: vi.fn(),
    getClass: vi.fn(),
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  }) as any;

  it('should allow requests without role requirements', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    expect(guard.canActivate(context({ role: 'customer' }))).toBe(true);
    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(
      ROLES_KEY,
      expect.any(Array),
    );
  });

  it('should allow an empty role requirement', () => {
    reflector.getAllAndOverride.mockReturnValue([]);
    expect(guard.canActivate(context({ role: 'customer' }))).toBe(true);
  });

  it('should reject when roles are required but there is no user', () => {
    reflector.getAllAndOverride.mockReturnValue(['manager']);
    expect(() => guard.canActivate(context())).toThrow(
      new ForbiddenException('Authentication required.'),
    );
  });

  it('should reject users without the required role', () => {
    reflector.getAllAndOverride.mockReturnValue(['manager']);
    expect(() => guard.canActivate(context({ role: 'customer' }))).toThrow(
      new ForbiddenException('Insufficient permissions.'),
    );
  });

  it('should allow a user with a required role', () => {
    reflector.getAllAndOverride.mockReturnValue(['manager', 'worker']);
    expect(guard.canActivate(context({ role: 'worker' }))).toBe(true);
  });
});
