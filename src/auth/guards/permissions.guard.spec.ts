import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PermissionsGuard } from './permissions.guard';

describe('PermissionsGuard', () => {
  const reflector = {
    getAllAndOverride: jest.fn(),
  } as unknown as Reflector;

  let guard: PermissionsGuard;

  beforeEach(() => {
    jest.clearAllMocks();
    guard = new PermissionsGuard(reflector);
  });

  const contextFactory = (permissions: string[]): ExecutionContext =>
    ({
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({
          user: {
            userId: 'u1',
            email: 'u1@test.com',
            roles: [],
            permissions,
          },
        }),
      }),
    }) as unknown as ExecutionContext;

  it('allows access when user includes every required permission', () => {
    reflector.getAllAndOverride = jest
      .fn()
      .mockReturnValue(['users.read', 'users.write']);

    const allowed = guard.canActivate(
      contextFactory(['users.read', 'users.write', 'users.delete']),
    );

    expect(allowed).toBe(true);
  });

  it('denies access when user is missing one required permission', () => {
    reflector.getAllAndOverride = jest
      .fn()
      .mockReturnValue(['users.read', 'users.write']);

    const allowed = guard.canActivate(contextFactory(['users.read']));

    expect(allowed).toBe(false);
  });
});
