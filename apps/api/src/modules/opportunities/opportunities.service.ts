// apps/api/src/modules/opportunities/opportunities.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { OpportunityStage, Prisma } from '@prisma/client'

const TRANSITIONS: Record<OpportunityStage, OpportunityStage[]> = {
  new_lead:    ['contacted', 'lost'],
  contacted:   ['comparison', 'presented', 'lost'],
  comparison:  ['presented', 'lost'],
  presented:   ['negotiation', 'lost'],
  negotiation: ['won', 'lost'],
  won:  [],
  lost: [],
}

@Injectable()
export class OpportunitiesService {
  constructor(private prisma: PrismaService) {}

  private filter(user: any): Prisma.OpportunityWhereInput {
    if (user.role === 'admin' || user.role === 'direction') return {}
    return { agent: { treePath: { startsWith: user.treePath } } }
  }

  // ── Dashboard comercial ─────────────────────────────────────────
  async getDashboard(user: any) {
    const base = this.filter(user)

    const [urgent, following, wonThisMonth, potentialAgg, todayActivities] = await Promise.all([
      // Urgentes: score alto o sin contactar
      this.prisma.opportunity.findMany({
        where: {
          ...base,
          stage:         { notIn: ['won', 'lost'] },
          contactStatus: 'not_contacted',
          supply:        { opportunityScore: { gte: 50 } },
        },
        include: {
          client: { select: { id: true, name: true, phone: true } },
          supply: { select: { id: true, cups: true, opportunityScore: true, currentSupplier: true, contractEndDate: true } },
        },
        orderBy: { supply: { opportunityScore: 'desc' } },
        take: 8,
      }),
      // En seguimiento: contactados o en conversación
      this.prisma.opportunity.findMany({
        where: {
          ...base,
          stage:         { notIn: ['won', 'lost'] },
          contactStatus: { in: ['contacted', 'in_conversation'] },
        },
        include: {
          client:     { select: { id: true, name: true, phone: true } },
          supply:     { select: { id: true, cups: true, opportunityScore: true } },
          activities: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
        orderBy: { lastContactAt: 'asc' },
        take: 6,
      }),
      // Ganadas este mes
      this.prisma.opportunity.count({
        where: {
          ...base,
          stage: 'won',
          wonAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
        },
      }),
      // Potencial total
      this.prisma.opportunity.aggregate({
        where: { ...base, stage: { notIn: ['won', 'lost'] } },
        _sum:   { estimatedValue: true },
        _count: true,
      }),
      // Actividad de hoy
      this.prisma.activity.count({
        where: {
          createdBy:  user.id,
          isAutomatic: false,
          createdAt:  { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      }),
    ])

    return {
      urgent,
      following,
      wonThisMonth,
      potentialTotal: potentialAgg._sum.estimatedValue ?? 0,
      openCount:      potentialAgg._count,
      todayActivities,
    }
  }

  // ── CRUD ────────────────────────────────────────────────────────
  async findAll(user: any, q: any) {
    const page  = Number(q.page  ?? 1)
    const limit = Number(q.limit ?? 25)
    const where: Prisma.OpportunityWhereInput = {
      ...this.filter(user),
      ...(q.stage         && { stage: q.stage }),
      ...(q.contactStatus && { contactStatus: q.contactStatus }),
      ...(q.serviceType   && { serviceType: q.serviceType }),
    }
    const [data, total] = await Promise.all([
      this.prisma.opportunity.findMany({
        where, skip: (page - 1) * limit, take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          client: { select: { id: true, name: true, phone: true } },
          supply: { select: { id: true, cups: true } },
          agent:  { select: { id: true, name: true } },
        },
      }),
      this.prisma.opportunity.count({ where }),
    ])
    return { data, total, page, limit }
  }

  async findOne(user: any, id: string) {
    const opp = await this.prisma.opportunity.findFirst({
      where: { id, ...this.filter(user) },
      include: {
        client:     { select: { id: true, name: true, phone: true, email: true } },
        supply:     true,
        agent:      { select: { id: true, name: true } },
        activities: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    })
    if (!opp) throw new NotFoundException('Oportunitat no trobada')
    return opp
  }

  async create(user: any, dto: any) {
    return this.prisma.opportunity.create({
      data: {
        ...dto,
        assignedAgentId: dto.assignedAgentId ?? user.id,
        createdBy:       user.id,
      },
    })
  }

  async update(user: any, id: string, dto: any) {
    await this.findOne(user, id)
    return this.prisma.opportunity.update({ where: { id }, data: dto })
  }

  async changeStage(user: any, id: string, body: { stage: OpportunityStage; lostReason?: string }) {
    const opp = await this.findOne(user, id)
    const allowed = TRANSITIONS[opp.stage as OpportunityStage]
    if (!allowed.includes(body.stage))
      throw new BadRequestException(`No es pot passar de ${opp.stage} a ${body.stage}`)

    const data: any = { stage: body.stage, updatedAt: new Date() }
    if (body.stage === 'won')  { data.wonAt = new Date(); data.contactStatus = 'closed_won' }
    if (body.stage === 'lost') { data.lostAt = new Date(); data.contactStatus = 'closed_lost'; data.lostReason = body.lostReason }

    const updated = await this.prisma.opportunity.update({ where: { id }, data })

    // Log automático
    await this.prisma.activity.create({
      data: {
        type:         'system',
        note:         `Stage: ${opp.stage} → ${body.stage}${body.lostReason ? '. Motiu: ' + body.lostReason : ''}`,
        opportunityId: id,
        clientId:     opp.clientId,
        createdBy:    user.id,
        isAutomatic:  true,
      },
    })
    return updated
  }

  // Registrar actividad (llamada, WA, email…)
  async addActivity(user: any, id: string, dto: { type: string; outcome?: string; note?: string; messageText?: string }) {
    const opp = await this.findOne(user, id)

    const activity = await this.prisma.activity.create({
      data: {
        ...dto,
        opportunityId: id,
        clientId:     opp.clientId,
        createdBy:    user.id,
      } as any,
    })

    // Actualizar contactStatus según outcome
    const statusMap: Record<string, string> = {
      interested:         'in_conversation',
      not_interested:     'closed_lost',
      no_answer:          'contacted',
      callback_requested: 'contacted',
      comparison_sent:    'contacted',
    }
    const newStatus = dto.outcome ? statusMap[dto.outcome] : null
    if (newStatus) {
      await this.prisma.opportunity.update({
        where: { id },
        data:  { contactStatus: newStatus as any, lastContactAt: new Date(), lastContactType: dto.type, contactAttempts: { increment: 1 } },
      })
    }
    return activity
  }

  async remove(user: any, id: string) {
    await this.findOne(user, id)
    return this.prisma.opportunity.delete({ where: { id } })
  }
}
