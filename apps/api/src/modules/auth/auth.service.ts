// apps/api/src/modules/auth/auth.service.ts
import { Injectable, UnauthorizedException } from '@nestjs/common'
import { JwtService }   from '@nestjs/jwt'
import { PrismaService }from '../../prisma/prisma.service'
import * as bcrypt      from 'bcryptjs'

@Injectable()
export class AuthService {
  constructor(
    private prisma:  PrismaService,
    private jwt:     JwtService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } })
    if (!user || !user.isActive)
      throw new UnauthorizedException('Credencials incorrectes')

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid)
      throw new UnauthorizedException('Credencials incorrectes')

    const payload = {
      sub:      user.id,
      email:    user.email,
      role:     user.role,
      treePath: user.treePath,
    }

    const accessToken  = this.jwt.sign(payload)
    const refreshToken = this.jwt.sign(payload, {
      secret:    process.env.JWT_REFRESH_SECRET ?? 'refresh-secret',
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
    })

    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)
    await this.prisma.refreshToken.create({
      data: { userId: user.id, token: refreshToken, expiresAt },
    })

    const { passwordHash, ...safeUser } = user
    return { accessToken, refreshToken, user: safeUser }
  }

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwt.verify(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET ?? 'refresh-secret',
      })
      const stored = await this.prisma.refreshToken.findUnique({
        where: { token: refreshToken },
      })
      if (!stored || stored.expiresAt < new Date())
        throw new UnauthorizedException('Token caducat')

      const accessToken = this.jwt.sign({
        sub:      payload.sub,
        email:    payload.email,
        role:     payload.role,
        treePath: payload.treePath,
      })
      return { accessToken }
    } catch {
      throw new UnauthorizedException('Token invàlid')
    }
  }

  async logout(refreshToken: string) {
    await this.prisma.refreshToken.deleteMany({ where: { token: refreshToken } })
    return { ok: true }
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where:  { id: userId },
      select: {
        id: true, name: true, email: true, role: true,
        phone: true, avatarUrl: true, treeLevel: true,
        treePath: true, commissionPct: true, monthlyTarget: true,
      },
    })
    if (!user) throw new UnauthorizedException()
    return user
  }

  async hashPassword(plain: string) {
    return bcrypt.hash(plain, 12)
  }
}
