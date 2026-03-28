// apps/api/src/modules/auth/jwt.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import { PrismaService } from '../../prisma/prisma.service'

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey:    process.env.JWT_SECRET ?? 'dev-secret',
      ignoreExpiration: false,
    })
  }

  async validate(payload: any) {
    const user = await this.prisma.user.findUnique({
      where:  { id: payload.sub, isActive: true },
      select: { id: true, email: true, role: true, treePath: true, treeLevel: true },
    })
    if (!user) throw new UnauthorizedException()
    return user
  }
}
