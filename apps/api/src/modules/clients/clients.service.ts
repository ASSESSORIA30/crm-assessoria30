// apps/api/src/modules/clients/clients.service.ts
import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { Prisma } from '@prisma/client'

@Injectable()
export class ClientsService {
  constructor(private prisma: PrismaService) {}

  private visibilityFilter(user: any): Prisma.ClientWhereInput {
    if (user.role === 'admin' || user.role === 'direction') return {}
    return { agent: { treePath: { startsWith: user.treePath } } }
  }

  async findAll(user: any, query: { search?: string; status?: string; page?: number; limit?: number }) {
    const page  = query.page  ?? 1
    const limit = query.limit ?? 25
    const where: Prisma.ClientWhereInput = {
      ...this.visibilityFilter(user),
      ...(query.status && { status: query.status as any }),
      ...(query.search && {
        OR: [
          { name:  { contains: query.search, mode: 'insensitive' } },
          { email: { contains: query.search, mode: 'insensitive' } },
          { taxId: { contains: query.search, mode: 'insensitive' } },
        ],
      }),
    }
    const [data, total] = await Promise.all([
      this.prisma.client.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true, name: true, taxId: true, type: true,
          status: true, email: true, phone: true,
          createdAt: true,
          agent:  { select: { id: true, name: true } },
          _count: { select: { supplies: true, opportunities: true } },
        },
      }),
      this.prisma.client.count({ where }),
    ])
    return { data, total, page, limit }
  }

  async findOne(user: any, id: string) {
    const client = await this.prisma.client.findFirst({
      where: { id, ...this.visibilityFilter(user) },
      include: {
        agent:    { select: { id: true, name: true } },
        supplies: {
          select: {
            id: true, cups: true, type: true, currentSupplier: true,
            tariff: true, contractEndDate: true,
            opportunityScore: true, opportunityCategory: true,
          },
        },
        opportunities: {
          where:   { stage: { notIn: ['won', 'lost'] } },
          select:  { id: true, title: true, stage: true, estimatedValue: true },
          orderBy: { createdAt: 'desc' },
          take:    5,
        },
      },
    })
    if (!client) throw new NotFoundException('Client no trobat')
    return client
  }

  async create(user: any, dto: any) {
    return this.prisma.client.create({
      data: {
        ...dto,
        assignedTo: dto.assignedTo ?? user.id,
        createdBy:  user.id,
      },
    })
  }

  async update(user: any, id: string, dto: any) {
    await this.findOne(user, id)
    return this.prisma.client.update({ where: { id }, data: dto })
  }

  async remove(user: any, id: string) {
    await this.findOne(user, id)
    return this.prisma.client.delete({ where: { id } })
  }
}
