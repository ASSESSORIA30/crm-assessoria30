import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { PrismaService } from '../../prisma/prisma.service'

@Controller('stats')
@UseGuards(JwtAuthGuard)
export class StatsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async getStats(@Query('from') from?: string, @Query('to') to?: string) {
    const dateFilter: any = {}
    if (from) dateFilter.gte = new Date(from)
    if (to) dateFilter.lte = new Date(to)
    const createdAtFilter = (from || to) ? { createdAt: dateFilter } : {}

    const [
      totalContracts,
      byAgent,
      byServiceType,
      byStage,
      bySupplyType,
      byCompany,
      byMonth,
      totalConsumption,
    ] = await Promise.all([
      this.prisma.opportunity.count({ where: { stage: { notIn: ['lost'] }, ...createdAtFilter } }),

      this.prisma.opportunity.groupBy({
        by: ['assignedAgentId'],
        _count: { id: true },
        where: { stage: { notIn: ['lost'] }, assignedAgentId: { not: null }, ...createdAtFilter },
      }),

      this.prisma.opportunity.groupBy({
        by: ['serviceType'],
        _count: { id: true },
        where: { stage: { notIn: ['lost'] }, ...createdAtFilter },
      }),

      this.prisma.opportunity.groupBy({
        by: ['stage'],
        _count: { id: true },
        where: createdAtFilter,
      }),

      this.prisma.supply.groupBy({
        by: ['type'],
        _count: { id: true },
        where: { status: 'active' },
      }),

      this.prisma.supply.groupBy({
        by: ['currentSupplier'],
        _count: { id: true },
        where: { status: 'active', currentSupplier: { not: null } },
      }),

      this.prisma.opportunity.groupBy({
        by: ['createdAt'],
        _count: { id: true },
        where: { stage: { notIn: ['lost'] }, ...createdAtFilter },
      }),

      this.prisma.supply.aggregate({
        _sum: { annualConsumption: true },
        _avg: { annualConsumption: true },
        where: { status: 'active', annualConsumption: { not: null } },
      }),
    ])

    // Resolve agent names
    const agentIds = byAgent.map(a => a.assignedAgentId).filter((id): id is string => id != null)
    const agents = agentIds.length > 0
      ? await this.prisma.user.findMany({ where: { id: { in: agentIds } }, select: { id: true, name: true } })
      : []
    const agentMap = new Map(agents.map(a => [a.id, a.name]))

    // Group opportunities by month
    const monthMap = new Map<string, number>()
    for (const row of byMonth) {
      const d = new Date(row.createdAt)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      monthMap.set(key, (monthMap.get(key) ?? 0) + row._count.id)
    }
    const monthlyData = Array.from(monthMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, count]) => ({ month, count }))

    // Accumulated monthly
    let acc = 0
    const monthlyAccum = monthlyData.map(m => ({ month: m.month, count: m.count, accumulated: (acc += m.count) }))

    // Stage mapping for Catalan labels
    const stageLabels: Record<string, string> = {
      new_lead: 'Nova', contacted: 'Contactat', comparison: 'Comparativa',
      presented: 'Presentat', negotiation: 'Negociació', won: 'Alta', lost: 'Perdut',
    }

    return {
      kpis: {
        totalContracts,
        totalConsumption: Math.round(totalConsumption._sum.annualConsumption ?? 0),
        avgConsumption: Math.round(totalConsumption._avg.annualConsumption ?? 0),
        totalAgents: agentIds.length,
      },
      byAgent: byAgent.map(r => ({
        agent: agentMap.get(r.assignedAgentId!) ?? 'Desconegut',
        count: r._count.id,
      })).sort((a, b) => b.count - a.count),
      byServiceType: byServiceType.map(r => ({
        type: r.serviceType,
        count: r._count.id,
      })),
      byStage: byStage.map(r => ({
        stage: stageLabels[r.stage] ?? r.stage,
        count: r._count.id,
      })),
      bySupplyType: bySupplyType.map(r => ({
        type: r.type === 'electric' ? 'Electricitat' : 'Gas',
        count: r._count.id,
      })),
      byCompany: byCompany.map(r => ({
        company: r.currentSupplier ?? '-',
        count: r._count.id,
      })).sort((a, b) => b.count - a.count).slice(0, 15),
      monthly: monthlyAccum,
    }
  }
}
