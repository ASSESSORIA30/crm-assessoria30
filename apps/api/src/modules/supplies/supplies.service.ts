// apps/api/src/modules/supplies/supplies.service.ts
import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { Prisma } from '@prisma/client'

@Injectable()
export class SuppliesService {
  constructor(private prisma: PrismaService) {}

  private filter(user: any): Prisma.SupplyWhereInput {
    if (user.role === 'admin' || user.role === 'direction') return {}
    return { agent: { treePath: { startsWith: user.treePath } } }
  }

  async findAll(user: any, q: any) {
    const page  = Number(q.page  ?? 1)
    const limit = Number(q.limit ?? 25)
    const where: Prisma.SupplyWhereInput = {
      ...this.filter(user),
      ...(q.type     && { type:    q.type }),
      ...(q.category && { opportunityCategory: q.category }),
      ...(q.search   && {
        OR: [
          { cups:            { contains: q.search } },
          { currentSupplier: { contains: q.search, mode: 'insensitive' } },
          { client: { name:  { contains: q.search, mode: 'insensitive' } } },
        ],
      }),
    }
    const [data, total] = await Promise.all([
      this.prisma.supply.findMany({
        where, skip: (page - 1) * limit, take: limit,
        orderBy: { opportunityScore: 'desc' },
        select: {
          id: true, cups: true, type: true, status: true,
          currentSupplier: true, tariff: true,
          contractEndDate: true, permanenceEndDate: true,
          opportunityScore: true, opportunityCategory: true,
          annualConsumption: true,
          client: { select: { id: true, name: true } },
          agent:  { select: { id: true, name: true } },
        },
      }),
      this.prisma.supply.count({ where }),
    ])
    return { data, total, page, limit }
  }

  async findOne(user: any, id: string) {
    const s = await this.prisma.supply.findFirst({
      where: { id, ...this.filter(user) },
      include: {
        client: { select: { id: true, name: true, phone: true } },
        agent:  { select: { id: true, name: true } },
        opportunities: {
          where:   { stage: { notIn: ['won', 'lost'] } },
          select:  { id: true, title: true, stage: true, estimatedValue: true },
          take: 5,
        },
      },
    })
    if (!s) throw new NotFoundException('Subministrament no trobat')
    return s
  }

  async create(user: any, dto: any) {
    return this.prisma.supply.create({
      data: { ...dto, assignedTo: dto.assignedTo ?? user.id, createdBy: user.id },
    })
  }

  async update(user: any, id: string, dto: any) {
    await this.findOne(user, id)
    return this.prisma.supply.update({ where: { id }, data: dto })
  }

  async remove(user: any, id: string) {
    await this.findOne(user, id)
    return this.prisma.supply.delete({ where: { id } })
  }

  // Preview para comparativa - datos precargados
  async comparisonPreview(user: any, id: string) {
    const s = await this.findOne(user, id)
    return {
      supplyId:          s.id,
      clientId:          s.clientId,
      cups:              s.cups,
      type:              s.type,
      currentSupplier:   s.currentSupplier,
      tariff:            s.tariff,
      annualConsumption: s.annualConsumption,
      powerP1:           s.powerP1,
      contractEndDate:   s.contractEndDate,
      permanenceEndDate: s.permanenceEndDate,
    }
  }
}
