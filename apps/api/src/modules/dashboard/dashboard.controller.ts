import { Controller, Get, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { PrismaService } from '../../prisma/prisma.service'

@Controller('dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private prisma: PrismaService) {}

  @Get('stats')
  async stats() {
    const [byServiceType, bySupplier, byAgent] = await Promise.all([
      // Contracts per tariff type (serviceType from opportunities)
      this.prisma.opportunity.groupBy({
        by: ['serviceType'],
        _count: { id: true },
        where: { stage: { notIn: ['lost'] } },
      }),

      // Contracts per company (currentSupplier from supplies)
      this.prisma.supply.groupBy({
        by: ['currentSupplier'],
        _count: { id: true },
        where: { status: 'active', currentSupplier: { not: null } },
      }),

      // Contracts per agent
      this.prisma.supply.groupBy({
        by: ['assignedTo'],
        _count: { id: true },
        where: { status: 'active', assignedTo: { not: null } },
      }),
    ])

    // Resolve agent names
    const agentIds = byAgent
      .map(a => a.assignedTo)
      .filter((id): id is string => id != null)

    const agents = agentIds.length > 0
      ? await this.prisma.user.findMany({
          where: { id: { in: agentIds } },
          select: { id: true, name: true },
        })
      : []

    const agentMap = new Map(agents.map(a => [a.id, a.name]))

    return {
      byServiceType: byServiceType.map(r => ({
        type: r.serviceType,
        count: r._count.id,
      })),
      byCompany: bySupplier
        .map(r => ({
          company: r.currentSupplier ?? 'Sense companyia',
          count: r._count.id,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      byAgent: byAgent
        .map(r => ({
          agent: agentMap.get(r.assignedTo!) ?? 'Desconegut',
          count: r._count.id,
        }))
        .sort((a, b) => b.count - a.count),
    }
  }
}
