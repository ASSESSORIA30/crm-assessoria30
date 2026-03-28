// apps/api/src/common/guards/jwt-auth.guard.ts
import { Injectable } from '@nestjs/common'
import { AuthGuard }  from '@nestjs/passport'
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}

// apps/api/src/common/guards/roles.guard.ts
import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}
  canActivate(ctx: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<string[]>('roles', [ctx.getHandler(), ctx.getClass()])
    if (!roles?.length) return true
    const { user } = ctx.switchToHttp().getRequest()
    return roles.includes(user?.role)
  }
}

// apps/api/src/common/decorators/current-user.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common'
export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext) => ctx.switchToHttp().getRequest().user,
)

// apps/api/src/common/decorators/roles.decorator.ts
import { SetMetadata } from '@nestjs/common'
export const Roles = (...roles: string[]) => SetMetadata('roles', roles)
