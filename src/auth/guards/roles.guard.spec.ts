import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  const reflector = {
    getAllAndOverride: jest.fn(),
  } as unknown as Reflector;

  let guard: RolesGuard;

  beforeEach(() => {
    jest.clearAllMocks();
    guard = new RolesGuard(reflector);
  });

  const contextFactory = (user: unknown): ExecutionContext =>
    ({
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({ user }),
      }),
    }) as unknown as ExecutionContext;

  it('allows access when user role matches required role type', () => {
    reflector.getAllAndOverride = jest.fn().mockReturnValue(['professional']);

    const allowed = guard.canActivate(
      contextFactory({
        roles: [{ name: 'client', type: 'professional' }],
        permissions: [],
      }),
    );

    expect(allowed).toBe(true);
  });

  it('allows access when user role matches required role name', () => {
    reflector.getAllAndOverride = jest.fn().mockReturnValue(['special-role']);

    const allowed = guard.canActivate(
      contextFactory({
        roles: [{ name: 'special-role', type: 'other' }],
        permissions: [],
      }),
    );

    expect(allowed).toBe(true);
  });

  it('denies access when none of user roles match', () => {
    reflector.getAllAndOverride = jest.fn().mockReturnValue(['professional']);

    const allowed = guard.canActivate(
      contextFactory({
        roles: [{ name: 'admin', type: 'admin' }],
        permissions: [],
      }),
    );

    expect(allowed).toBe(false);
  });
});
