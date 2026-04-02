import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import * as PDFDocument from 'pdfkit'

interface LiquidationLine {
  company: string
  producte: string
  altes: number
  importCobrat: number
  percentatge: number
  comissio: number
}

@Injectable()
export class LiquidationsService {
  constructor(private prisma: PrismaService) {}

  async generate(agentId: string, inicio: string, fin: string) {
    const agent = await this.prisma.agent.findUnique({
      where: { id: agentId },
      include: {
        comissions: {
          where: { actiu: true },
          include: { company: true },
        },
      },
    })
    if (!agent) throw new Error('Agent not found')

    const linies: LiquidationLine[] = agent.comissions.map((c) => {
      const altes = 0
      const importCobrat = 0
      return {
        company: c.company.nombre,
        producte: c.producte ?? 'General',
        altes,
        importCobrat,
        percentatge: c.percentatge,
        comissio: importCobrat * (c.percentatge / 100),
      }
    })

    const totalBrut = linies.reduce((sum, l) => sum + l.comissio, 0)
    const retencioIrpf = agent.tipus === 'autonom'
      ? totalBrut * (agent.irpfRetencio / 100)
      : 0
    const totalNet = totalBrut - retencioIrpf

    const liquidation = await this.prisma.liquidation.create({
      data: {
        agentId,
        periodeInicio: new Date(inicio),
        periodeFin: new Date(fin),
        totalBrut: Math.round(totalBrut * 100) / 100,
        retencioIrpf: Math.round(retencioIrpf * 100) / 100,
        totalNet: Math.round(totalNet * 100) / 100,
        estat: 'esborrany',
        linies: linies as any,
      },
      include: { agent: true },
    })

    return liquidation
  }

  async updateLines(id: string, linies: LiquidationLine[]) {
    const totalBrut = linies.reduce((sum, l) => sum + l.comissio, 0)
    const liq = await this.prisma.liquidation.findUnique({
      where: { id },
      include: { agent: true },
    })
    if (!liq) throw new Error('Liquidation not found')

    const retencioIrpf = liq.agent.tipus === 'autonom'
      ? totalBrut * (liq.agent.irpfRetencio / 100)
      : 0
    const totalNet = totalBrut - retencioIrpf

    return this.prisma.liquidation.update({
      where: { id },
      data: {
        linies: linies as any,
        totalBrut: Math.round(totalBrut * 100) / 100,
        retencioIrpf: Math.round(retencioIrpf * 100) / 100,
        totalNet: Math.round(totalNet * 100) / 100,
      },
      include: { agent: true },
    })
  }

  async approve(id: string) {
    return this.prisma.liquidation.update({
      where: { id },
      data: { estat: 'aprovada' },
    })
  }

  async markPaid(id: string) {
    return this.prisma.liquidation.update({
      where: { id },
      data: { estat: 'pagada' },
    })
  }

  async generatePdf(id: string): Promise<Buffer> {
    const liq = await this.prisma.liquidation.findUnique({
      where: { id },
      include: { agent: true },
    })
    if (!liq) throw new Error('Liquidation not found')

    const linies = (liq.linies as any[]) ?? []
    const fmtDate = (d: Date) => d.toLocaleDateString('ca-ES')
    const fmtMoney = (n: number) => `${n.toFixed(2)} \u20ac`

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 })
      const chunks: Buffer[] = []
      doc.on('data', (c: Buffer) => chunks.push(c))
      doc.on('end', () => resolve(Buffer.concat(chunks)))
      doc.on('error', reject)

      // Header
      doc.fontSize(20).font('Helvetica-Bold')
        .text('Assessoria 3.0', 50, 50)
      doc.fontSize(10).font('Helvetica')
        .text('Liquidaci\u00f3 de comissions', 50, 75)

      doc.moveTo(50, 95).lineTo(545, 95).stroke('#e2e8f0')

      // Agent info
      doc.fontSize(11).font('Helvetica-Bold')
        .text('Agent:', 50, 110)
      doc.font('Helvetica')
        .text(`${liq.agent.nombre}`, 110, 110)
        .text(`NIF: ${liq.agent.nif}`, 50, 128)
        .text(`Tipus: ${liq.agent.tipus === 'autonom' ? 'Aut\u00f2nom' : 'Empresa'}`, 250, 128)
        .text(`Per\u00edode: ${fmtDate(liq.periodeInicio)} - ${fmtDate(liq.periodeFin)}`, 50, 146)

      doc.moveTo(50, 170).lineTo(545, 170).stroke('#e2e8f0')

      // Table header
      const tableTop = 185
      const colX = [50, 170, 260, 330, 400, 475]

      doc.fontSize(9).font('Helvetica-Bold')
        .fillColor('#64748b')
        .text('Companyia', colX[0], tableTop)
        .text('Producte', colX[1], tableTop)
        .text('Altes', colX[2], tableTop, { width: 60, align: 'right' })
        .text('Import cobrat', colX[3], tableTop, { width: 60, align: 'right' })
        .text('% Comissi\u00f3', colX[4], tableTop, { width: 60, align: 'right' })
        .text('Total', colX[5], tableTop, { width: 60, align: 'right' })

      doc.moveTo(50, tableTop + 15).lineTo(545, tableTop + 15).stroke('#e2e8f0')

      // Table rows
      doc.fillColor('#1e293b').font('Helvetica').fontSize(9)
      let y = tableTop + 25
      for (const l of linies) {
        if (y > 720) {
          doc.addPage()
          y = 50
        }
        doc.text(l.company, colX[0], y, { width: 115 })
          .text(l.producte, colX[1], y, { width: 85 })
          .text(String(l.altes ?? 0), colX[2], y, { width: 60, align: 'right' })
          .text(fmtMoney(l.importCobrat ?? 0), colX[3], y, { width: 60, align: 'right' })
          .text(`${l.percentatge}%`, colX[4], y, { width: 60, align: 'right' })
          .text(fmtMoney(l.comissio ?? 0), colX[5], y, { width: 60, align: 'right' })
        y += 18
      }

      // Totals
      y += 10
      doc.moveTo(350, y).lineTo(545, y).stroke('#e2e8f0')
      y += 10

      doc.font('Helvetica-Bold').fontSize(10)
        .text('Total brut:', 350, y, { width: 120, align: 'right' })
        .text(fmtMoney(liq.totalBrut), 475, y, { width: 60, align: 'right' })
      y += 18

      if (liq.retencioIrpf > 0) {
        doc.font('Helvetica').fontSize(10)
          .text(`Retenci\u00f3 IRPF (${liq.agent.irpfRetencio}%):`, 350, y, { width: 120, align: 'right' })
          .text(`-${fmtMoney(liq.retencioIrpf)}`, 475, y, { width: 60, align: 'right' })
        y += 18
      }

      doc.moveTo(350, y).lineTo(545, y).stroke('#1e293b')
      y += 10

      doc.font('Helvetica-Bold').fontSize(12)
        .text('TOTAL NET:', 350, y, { width: 120, align: 'right' })
        .text(fmtMoney(liq.totalNet), 475, y, { width: 60, align: 'right' })

      // Footer
      doc.fontSize(8).font('Helvetica').fillColor('#94a3b8')
        .text(
          `Generat el ${new Date().toLocaleDateString('ca-ES')} - Assessoria 3.0`,
          50, 770,
          { align: 'center', width: 495 },
        )

      doc.end()
    })
  }
}
