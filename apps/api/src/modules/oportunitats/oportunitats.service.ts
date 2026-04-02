import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

@Injectable()
export class OportunitatsService {
  constructor(private prisma: PrismaService) {}

  async detectOpportunities(tarifaId: string) {
    const tarifa = await this.prisma.tarifa.findUnique({
      where: { id: tarifaId },
      include: { company: true },
    })
    if (!tarifa || !tarifa.preuKwh) return []

    // Find all active supplies that are not currently with this company
    const supplies = await this.prisma.supply.findMany({
      where: {
        status: 'active',
        annualConsumption: { not: null, gt: 0 },
        type: tarifa.tipus === 'gas' ? 'gas' : 'electric',
      },
      include: { client: true },
    })

    const created: any[] = []

    for (const supply of supplies) {
      // Skip if already managed by the same company
      if (supply.currentSupplier?.toLowerCase() === tarifa.company?.nombre?.toLowerCase()) continue

      // Calculate savings: compare current cost vs new tariff cost
      const consumption = supply.annualConsumption!
      const currentKwhPrice = supply.type === 'electric'
        ? (supply as any).powerP1 ?? 0.15  // fallback approximate
        : 0.06 // fallback gas approximate

      const currentCost = consumption * currentKwhPrice
      const newCost = consumption * tarifa.preuKwh!
      const savings = currentCost - newCost
      const savingsPct = currentCost > 0 ? (savings / currentCost) * 100 : 0

      if (savingsPct <= 0) continue

      // Check if opportunity already exists for this client+tarifa
      const existing = await this.prisma.oportunitat.findFirst({
        where: {
          clientId: supply.clientId,
          tarifaNovaId: tarifaId,
          estat: { in: ['oportunitat', 'revisar'] },
        },
      })
      if (existing) continue

      const estat = savingsPct > 10 ? 'oportunitat' : 'revisar'

      const opp = await this.prisma.oportunitat.create({
        data: {
          clientId: supply.clientId,
          tarifaNovaId: tarifaId,
          estalviAnual: Math.round(savings * 100) / 100,
          estat,
        },
        include: {
          client: { select: { name: true } },
          tarifaNova: { include: { company: { select: { nombre: true } } } },
        },
      })
      created.push(opp)
    }

    return created
  }
}
