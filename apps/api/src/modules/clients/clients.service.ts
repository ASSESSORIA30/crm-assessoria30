// apps/api/src/modules/clients/clients.service.ts
import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { Prisma } from '@prisma/client'

@Injectable()
export class ClientsService {
  private readonly logger = new Logger(ClientsService.name)

  constructor(private prisma: PrismaService) {}

  private visibilityFilter(user: any): Prisma.ClientWhereInput {
    if (user.role === 'admin' || user.role === 'direction') return {}
    // If treePath is not set fall back to showing clients the agent owns directly
    if (!user.treePath) return { assignedTo: user.id }
    return {
      OR: [
        { assignedTo: user.id },
        { agent: { treePath: { startsWith: user.treePath } } },
      ],
    }
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
    let client: any
    try {
      client = await this.prisma.client.findFirst({
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
    } catch (err: any) {
      this.logger.error('client.findOne failed', err?.message, err?.code)
      // If opportunityScore/opportunityCategory columns are missing, retry without them
      if (err?.message?.includes('opportunityScore') || err?.message?.includes('opportunityCategory') ||
          err?.message?.includes('opportunity_score') || err?.message?.includes('opportunity_category')) {
        client = await this.prisma.client.findFirst({
          where: { id, ...this.visibilityFilter(user) },
          include: {
            agent:    { select: { id: true, name: true } },
            supplies: {
              select: {
                id: true, cups: true, type: true, currentSupplier: true,
                tariff: true, contractEndDate: true,
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
      } else {
        throw err
      }
    }
    if (!client) throw new NotFoundException('Client no trobat')
    return client
  }

  /**
   * Remove keys with empty-string or null values so Prisma stores NULL.
   * Avoids unique-constraint violations on taxId when left blank.
   * Uses delete (not undefined) so the key is absent from the spread.
   */
  private sanitize(dto: any) {
    const optional = ['taxId', 'email', 'phone', 'fixedPhone', 'source', 'notes',
                      'addressStreet', 'addressCity', 'addressProvince', 'addressZip',
                      'dataRenovacio', 'assignedTo', 'representantName', 'representantDni']
    const out: any = { ...dto }
    for (const key of optional) {
      if (out[key] === '' || out[key] === null || out[key] === undefined) {
        delete out[key]
      }
    }
    return out
  }

  async create(user: any, dto: any) {
    const clean = this.sanitize(dto)
    try {
      return await this.prisma.client.create({
        data: {
          ...clean,
          assignedTo: clean.assignedTo ?? user.id,
          createdBy:  user.id,
        },
      })
    } catch (err: any) {
      this.logger.error('client.create failed', err?.message, err?.code, JSON.stringify(clean))
      if (err?.code === 'P2002') {
        const field = err?.meta?.target?.[0] ?? 'camp'
        throw new BadRequestException(`Ja existeix un client amb el mateix ${field === 'tax_id' ? 'NIF/CIF' : field}`)
      }
      throw err
    }
  }

  async update(user: any, id: string, dto: any) {
    await this.findOne(user, id)
    return this.prisma.client.update({ where: { id }, data: this.sanitize(dto) })
  }

  async remove(user: any, id: string) {
    await this.findOne(user, id)
    return this.prisma.client.delete({ where: { id } })
  }
}
