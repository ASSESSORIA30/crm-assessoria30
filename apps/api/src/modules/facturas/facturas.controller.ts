import { Controller, Get, Post, Patch, Param, Body, Res, UseGuards } from '@nestjs/common'
import { Response } from 'express'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { PrismaService } from '../../prisma/prisma.service'
import { FacturasService } from './facturas.service'

@Controller('facturas')
@UseGuards(JwtAuthGuard)
export class FacturasController {
  constructor(
    private prisma: PrismaService,
    private service: FacturasService,
  ) {}

  @Get()
  async list() {
    return this.prisma.factura.findMany({
      include: { client: { select: { name: true, taxId: true } } },
      orderBy: { createdAt: 'desc' },
    })
  }

  @Get('next-numero')
  async nextNumero() {
    const numero = await this.service.getNextNumero()
    return { numero }
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    return this.prisma.factura.findUnique({ where: { id }, include: { client: true } })
  }

  @Post()
  async create(@Body() body: {
    clientId: string
    linies: Array<{ descripcio: string; quantitat: number; preuUnitari: number }>
    ivaPercentatge?: number
  }) {
    return this.service.create(body)
  }

  @Post(':id/emit')
  async emit(@Param('id') id: string) {
    return this.service.emitAndSubmit(id)
  }

  @Get(':id/pdf')
  async pdf(@Param('id') id: string, @Res() res: Response) {
    const buffer = await this.service.generatePdf(id)
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=factura-${id.slice(0, 8)}.pdf`,
      'Content-Length': buffer.length,
    })
    res.end(buffer)
  }
}
