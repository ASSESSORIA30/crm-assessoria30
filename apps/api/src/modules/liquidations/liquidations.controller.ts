import { Controller, Get, Post, Patch, Param, Body, Query, Res, UseGuards } from '@nestjs/common'
import { Response } from 'express'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { PrismaService } from '../../prisma/prisma.service'
import { LiquidationsService } from './liquidations.service'

@Controller('liquidations')
@UseGuards(JwtAuthGuard)
export class LiquidationsController {
  constructor(
    private prisma: PrismaService,
    private service: LiquidationsService,
  ) {}

  @Get('agents')
  async agents() {
    return this.prisma.agent.findMany({
      orderBy: { nombre: 'asc' },
      include: { _count: { select: { liquidations: true } } },
    })
  }

  @Post('agents')
  async createAgent(@Body() body: any) {
    return this.prisma.agent.create({
      data: {
        nombre: body.nombre,
        nif: body.nif,
        email: body.email ?? null,
        telefon: body.telefon ?? null,
        tipus: body.tipus ?? 'autonom',
        irpfRetencio: body.irpfRetencio ?? 15,
      },
    })
  }

  @Get('agents/:agentId/comissions')
  async agentComissions(@Param('agentId') agentId: string) {
    return this.prisma.agentComission.findMany({
      where: { agentId },
      include: { company: { select: { nombre: true } } },
    })
  }

  @Post('agents/:agentId/comissions')
  async addComission(@Param('agentId') agentId: string, @Body() body: any) {
    return this.prisma.agentComission.create({
      data: {
        agentId,
        companyId: body.companyId,
        producte: body.producte ?? null,
        percentatge: body.percentatge,
      },
      include: { company: { select: { nombre: true } } },
    })
  }

  @Get()
  async list(@Query('agentId') agentId?: string) {
    const where: any = {}
    if (agentId) where.agentId = agentId
    return this.prisma.liquidation.findMany({
      where,
      include: { agent: { select: { nombre: true, nif: true } } },
      orderBy: { createdAt: 'desc' },
    })
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    return this.prisma.liquidation.findUnique({
      where: { id },
      include: { agent: true },
    })
  }

  @Post('generate')
  async generate(@Body() body: { agentId: string; inicio: string; fin: string }) {
    return this.service.generate(body.agentId, body.inicio, body.fin)
  }

  @Patch(':id/lines')
  async updateLines(@Param('id') id: string, @Body() body: { linies: any[] }) {
    return this.service.updateLines(id, body.linies)
  }

  @Patch(':id/approve')
  async approve(@Param('id') id: string) {
    return this.service.approve(id)
  }

  @Patch(':id/paid')
  async markPaid(@Param('id') id: string) {
    return this.service.markPaid(id)
  }

  @Get(':id/pdf')
  async pdf(@Param('id') id: string, @Res() res: Response) {
    const buffer = await this.service.generatePdf(id)
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=liquidacio-${id.slice(0, 8)}.pdf`,
      'Content-Length': buffer.length,
    })
    res.end(buffer)
  }
}
