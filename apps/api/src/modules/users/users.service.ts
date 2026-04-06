// apps/api/src/modules/users/users.service.ts
import { Injectable, ConflictException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { AuthService }   from '../auth/auth.service'

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService, private auth: AuthService) {}

  async myTeam(user: any) {
    const where = user.role === 'admin' || user.role === 'direction'
      ? { isActive: true }
      : { isActive: true, treePath: { startsWith: user.treePath + '/' } }
    return this.prisma.user.findMany({
      where,
      select: {
        id: true, name: true, email: true, role: true,
        treeLevel: true, phone: true, parentUserId: true,
        commissionPct: true, subagentPct: true, monthlyTarget: true,
      },
      orderBy: [{ treeLevel: 'asc' }, { name: 'asc' }],
    })
  }

  async create(user: any, dto: any) {
    const exists = await this.prisma.user.findUnique({ where: { email: dto.email } })
    if (exists) throw new ConflictException('Email ja registrat')

    const parent = await this.prisma.user.findUnique({ where: { id: dto.parentUserId ?? user.id } })
    const treeLevel  = (parent?.treeLevel ?? 0) + 1
    const parentPath = parent?.treePath ?? `/${user.id}`
    const hash       = await this.auth.hashPassword(dto.password)

    const newUser = await this.prisma.user.create({
      data: {
        name:         dto.name,
        email:        dto.email,
        passwordHash: hash,
        role:         dto.role ?? 'commercial',
        phone:        dto.phone,
        parentUserId: dto.parentUserId ?? user.id,
        treeLevel,
        treePath:     'tmp',
        commissionPct: dto.commissionPct ?? 20,
      },
    })
    await this.prisma.user.update({
      where: { id: newUser.id },
      data:  { treePath: `${parentPath}/${newUser.id}` },
    })
    const { passwordHash, ...safe } = newUser
    return safe
  }

  async myStats(user: any) {
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const [clients, supplies, openOpps, todayActs] = await Promise.all([
      this.prisma.client.count({ where: { assignedTo: user.id } }),
      this.prisma.supply.count({ where: { assignedTo: user.id, status: 'active' } }),
      this.prisma.opportunity.count({ where: { assignedAgentId: user.id, stage: { notIn: ['won', 'lost'] } } }),
      this.prisma.activity.count({  where: { createdBy: user.id, isAutomatic: false, createdAt: { gte: today } } }),
    ])
    return { clients, supplies, openOpps, todayActs }
  }
}

// ─────────────────────────────────────────────────────────────────
// apps/api/src/modules/users/users.controller.ts
import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { CurrentUser }  from '../../common/decorators/current-user.decorator'

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private s: UsersService) {}
  @Get('my-team')   myTeam (@CurrentUser() u: any)              { return this.s.myTeam(u) }
  @Get('my-stats')  myStats(@CurrentUser() u: any)              { return this.s.myStats(u) }
  @Post()           create (@CurrentUser() u: any, @Body() dto: any) { return this.s.create(u, dto) }
}
