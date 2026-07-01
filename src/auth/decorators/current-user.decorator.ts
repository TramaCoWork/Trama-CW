import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { RoleType } from '@prisma/client';

export interface CurrentUserRole {
  name: string;
  type: RoleType;
}

export interface CurrentUserType {
  userId: string;
  email: string;
  roles: CurrentUserRole[];
  permissions: string[];
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CurrentUserType => {
    const request = ctx.switchToHttp().getRequest<{ user: CurrentUserType }>();
    return request.user;
  },
);
