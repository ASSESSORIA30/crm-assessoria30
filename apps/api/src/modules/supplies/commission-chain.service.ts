import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

@Injectable()
export class CommissionChainService {
  constructor(private prisma: PrismaService) {}

  /**
   * Walk up the hierarchy from the assigned agent to level 1 (admin/master).
   * Returns array of { userId, name, treeLevel, subagentPct } from bottom to top.
   */
  async getChain(agentId: string): Promise<Array<{ id: string; name: string; treeLevel: number; subagentPct: number }>> {
    const chain: Array<{ id: string; name: string; treeLevel: number; subagentPct: number }> = []
    let currentId: string | null = agentId
    let depth = 0

    while (currentId && depth < 5) {
      const user = await this.prisma.user.findUnique({
        where: { id: currentId },
        select: { id: true, name: true, treeLevel: true, subagentPct: true, parentUserId: true },
      })
      if (!user) break
      chain.push({
        id: user.id,
        name: user.name,
        treeLevel: user.treeLevel,
        subagentPct: user.subagentPct ?? 70,
      })
      currentId = user.parentUserId
      depth++
    }

    return chain.reverse() // top (admin) → bottom (agent)
  }

  /**
   * Calculate and save commissions for the entire chain.
   * comissioMaster is the total the company pays.
   * Each level takes its cut and passes subagentPct% to the next level.
   */
  async calculateAndSave(supplyId: string, agentId: string, totalCommission: number) {
    const chain = await this.getChain(agentId)
    if (chain.length === 0) return []

    // Delete existing commissions for this supply
    await this.prisma.supplyCommission.deleteMany({ where: { supplyId } })

    const commissions: Array<{ agentId: string; nivel: number; comissio: number; percentatge: number }> = []
    let remaining = totalCommission

    for (let i = 0; i < chain.length; i++) {
      const agent = chain[i]
      const isLast = i === chain.length - 1
      const nivel = i + 1

      if (isLast) {
        // Last agent gets all remaining
        commissions.push({
          agentId: agent.id,
          nivel,
          comissio: Math.round(remaining * 100) / 100,
          percentatge: totalCommission > 0 ? Math.round((remaining / totalCommission) * 10000) / 100 : 0,
        })
      } else {
        // This agent keeps (100 - subagentPct)% and passes subagentPct% down
        const passDown = remaining * (agent.subagentPct / 100)
        const keeps = remaining - passDown

        commissions.push({
          agentId: agent.id,
          nivel,
          comissio: Math.round(keeps * 100) / 100,
          percentatge: totalCommission > 0 ? Math.round((keeps / totalCommission) * 10000) / 100 : 0,
        })

        remaining = passDown
      }
    }

    // Save to DB
    await this.prisma.supplyCommission.createMany({
      data: commissions.map(c => ({
        supplyId,
        agentId: c.agentId,
        nivel: c.nivel,
        comissio: c.comissio,
        percentatge: c.percentatge,
      })),
    })

    // Update supply totals
    const masterComm = commissions[0]?.comissio ?? 0
    const agentComm = commissions[commissions.length - 1]?.comissio ?? 0
    await this.prisma.supply.update({
      where: { id: supplyId },
      data: { comissioMaster: totalCommission, comissioAgent: agentComm },
    })

    return commissions
  }

  /**
   * Get commissions for a supply, filtered by user role.
   * Admin sees all; agent sees only their level and below.
   */
  async getForSupply(supplyId: string, user: any) {
    const all = await this.prisma.supplyCommission.findMany({
      where: { supplyId },
      include: { agent: { select: { id: true, name: true } } },
      orderBy: { nivel: 'asc' },
    })

    const isAdmin = user.role === 'admin' || user.role === 'direction'
    if (isAdmin) return all

    // Non-admin: show only their commission and their subagents'
    return all.filter(c => {
      if (c.agentId === user.id) return true
      // Check if this agent is a descendant of the user
      return false // Simple filter — show own only
    })
  }
}
