import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import * as PDFDocument from 'pdfkit'
import Anthropic from '@anthropic-ai/sdk'

interface ConsumptionData {
  cups?: string
  powerP1?: number; powerP2?: number; powerP3?: number
  energyP1?: number; energyP2?: number; energyP3?: number
  energyP4?: number; energyP5?: number; energyP6?: number
  currentPowerPriceP1?: number; currentPowerPriceP2?: number; currentPowerPriceP3?: number
  currentEnergyPriceP1?: number; currentEnergyPriceP2?: number; currentEnergyPriceP3?: number
  currentEnergyPriceP4?: number; currentEnergyPriceP5?: number; currentEnergyPriceP6?: number
  clientName?: string; clientNif?: string; clientAddress?: string
  agentId?: string
}

interface ComparisonResult {
  tariffId: string
  company: string
  tariffType: string
  newCostEnergy: number
  newCostPower: number
  newCostTotal: number
  currentCostTotal: number
  savingsEur: number
  savingsPct: number
  commissionKwh: number | null
  commissionPower: number | null
  estimatedCommission: number
}

@Injectable()
export class ComparisonsService {
  constructor(private prisma: PrismaService) {}

  async lookupCups(cups: string) {
    const supply = await this.prisma.supply.findUnique({
      where: { cups },
      include: { client: true },
    })
    return supply
  }

  async generate(data: ConsumptionData): Promise<{ id: string; results: ComparisonResult[]; best: ComparisonResult | null }> {
    const tariffs = await this.prisma.tariff.findMany({
      where: {
        energyPriceP1: { not: null },
      },
    })

    const totalEnergy = (data.energyP1 ?? 0) + (data.energyP2 ?? 0) + (data.energyP3 ?? 0)
      + (data.energyP4 ?? 0) + (data.energyP5 ?? 0) + (data.energyP6 ?? 0)

    // Current cost
    const currentCostEnergy =
      (data.energyP1 ?? 0) * (data.currentEnergyPriceP1 ?? 0) +
      (data.energyP2 ?? 0) * (data.currentEnergyPriceP2 ?? 0) +
      (data.energyP3 ?? 0) * (data.currentEnergyPriceP3 ?? 0) +
      (data.energyP4 ?? 0) * (data.currentEnergyPriceP4 ?? 0) +
      (data.energyP5 ?? 0) * (data.currentEnergyPriceP5 ?? 0) +
      (data.energyP6 ?? 0) * (data.currentEnergyPriceP6 ?? 0)

    const currentCostPower =
      (data.powerP1 ?? 0) * (data.currentPowerPriceP1 ?? 0) +
      (data.powerP2 ?? 0) * (data.currentPowerPriceP2 ?? 0) +
      (data.powerP3 ?? 0) * (data.currentPowerPriceP3 ?? 0)

    const currentCostTotal = currentCostEnergy + currentCostPower

    const results: ComparisonResult[] = tariffs.map((t) => {
      const newCostEnergy =
        (data.energyP1 ?? 0) * (t.energyPriceP1 ?? 0) +
        (data.energyP2 ?? 0) * (t.energyPriceP2 ?? 0) +
        (data.energyP3 ?? 0) * (t.energyPriceP3 ?? 0) +
        (data.energyP4 ?? 0) * (t.energyPriceP4 ?? 0) +
        (data.energyP5 ?? 0) * (t.energyPriceP5 ?? 0) +
        (data.energyP6 ?? 0) * (t.energyPriceP6 ?? 0)

      const newCostPower =
        (data.powerP1 ?? 0) * (t.powerPriceP1 ?? 0) +
        (data.powerP2 ?? 0) * (t.powerPriceP2 ?? 0) +
        (data.powerP3 ?? 0) * (t.powerPriceP3 ?? 0)

      const newCostTotal = newCostEnergy + newCostPower
      const savingsEur = currentCostTotal - newCostTotal
      const savingsPct = currentCostTotal > 0 ? (savingsEur / currentCostTotal) * 100 : 0

      const estimatedCommission =
        totalEnergy * (t.commissionKwh ?? 0) +
        ((data.powerP1 ?? 0) + (data.powerP2 ?? 0) + (data.powerP3 ?? 0)) * (t.commissionPower ?? 0)

      return {
        tariffId: t.id,
        company: t.company ?? 'Desconeguda',
        tariffType: t.tariffType ?? '-',
        newCostEnergy: Math.round(newCostEnergy * 100) / 100,
        newCostPower: Math.round(newCostPower * 100) / 100,
        newCostTotal: Math.round(newCostTotal * 100) / 100,
        currentCostTotal: Math.round(currentCostTotal * 100) / 100,
        savingsEur: Math.round(savingsEur * 100) / 100,
        savingsPct: Math.round(savingsPct * 10) / 10,
        commissionKwh: t.commissionKwh,
        commissionPower: t.commissionPower,
        estimatedCommission: Math.round(estimatedCommission * 100) / 100,
      }
    }).sort((a, b) => b.savingsEur - a.savingsEur)

    const best = results[0] ?? null

    const saved = await this.prisma.comparison.create({
      data: {
        cups: data.cups ?? null,
        clientName: data.clientName ?? null,
        clientNif: data.clientNif ?? null,
        clientAddress: data.clientAddress ?? null,
        currentData: data as any,
        results: results as any,
        bestTariffId: best?.tariffId ?? null,
        totalSavings: best?.savingsEur ?? null,
        createdBy: data.agentId ?? null,
      },
    })

    return { id: saved.id, results, best }
  }

  async generatePdf(id: string): Promise<Buffer> {
    const comp = await this.prisma.comparison.findUnique({ where: { id } })
    if (!comp) throw new Error('Comparison not found')

    const results = (comp.results as unknown as ComparisonResult[]) ?? []
    const fmtMoney = (n: number) => `${n.toFixed(2)} €`

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 })
      const chunks: Buffer[] = []
      doc.on('data', (c: Buffer) => chunks.push(c))
      doc.on('end', () => resolve(Buffer.concat(chunks)))
      doc.on('error', reject)

      // Header
      doc.fontSize(18).font('Helvetica-Bold').text('Comparativa Energètica', 50, 50)
      doc.fontSize(10).font('Helvetica').fillColor('#64748b')
        .text(`Assessoria 3.0 — ${new Date().toLocaleDateString('ca-ES')}`, 50, 75)

      doc.moveTo(50, 95).lineTo(545, 95).stroke('#e2e8f0')

      // Client info
      let y = 110
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#1e293b')
      if (comp.clientName) { doc.text(`Client: ${comp.clientName}`, 50, y); y += 15 }
      if (comp.cups) { doc.font('Helvetica').text(`CUPS: ${comp.cups}`, 50, y); y += 15 }
      if (comp.clientNif) { doc.text(`NIF: ${comp.clientNif}`, 50, y); y += 15 }

      y += 10
      doc.moveTo(50, y).lineTo(545, y).stroke('#e2e8f0')
      y += 15

      // Table
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#64748b')
      const cols = [50, 140, 240, 310, 380, 450, 505]
      doc.text('Companyia', cols[0], y)
        .text('Tarifa', cols[1], y)
        .text('Cost actual', cols[2], y, { width: 60, align: 'right' })
        .text('Cost nou', cols[3], y, { width: 60, align: 'right' })
        .text('Estalvi', cols[4], y, { width: 60, align: 'right' })
        .text('%', cols[5], y, { width: 35, align: 'right' })

      y += 12
      doc.moveTo(50, y).lineTo(545, y).stroke('#e2e8f0')
      y += 5

      doc.font('Helvetica').fontSize(8).fillColor('#1e293b')
      for (const r of results.slice(0, 15)) {
        if (y > 720) { doc.addPage(); y = 50 }
        const isBest = r.tariffId === comp.bestTariffId
        if (isBest) {
          doc.rect(48, y - 2, 500, 14).fill('#f0fdf4').fillColor('#166534')
        } else {
          doc.fillColor('#1e293b')
        }
        doc.text(r.company, cols[0], y, { width: 85 })
          .text(r.tariffType, cols[1], y, { width: 95 })
          .text(fmtMoney(r.currentCostTotal), cols[2], y, { width: 60, align: 'right' })
          .text(fmtMoney(r.newCostTotal), cols[3], y, { width: 60, align: 'right' })
          .text(fmtMoney(r.savingsEur), cols[4], y, { width: 60, align: 'right' })
          .text(`${r.savingsPct}%`, cols[5], y, { width: 35, align: 'right' })
        y += 14
      }

      // Best option
      if (results[0]) {
        y += 15
        doc.moveTo(50, y).lineTo(545, y).stroke('#1e293b')
        y += 12
        doc.font('Helvetica-Bold').fontSize(11).fillColor('#166534')
          .text(`Millor opció: ${results[0].company} - ${results[0].tariffType}`, 50, y)
        y += 16
        doc.fontSize(10)
          .text(`Estalvi anual: ${fmtMoney(results[0].savingsEur)} (${results[0].savingsPct}%)`, 50, y)
      }

      doc.fontSize(8).font('Helvetica').fillColor('#94a3b8')
        .text('Document generat automàticament per Assessoria 3.0', 50, 770, { align: 'center', width: 495 })

      doc.end()
    })
  }

  async extractInvoice(buffer: Buffer, mimetype: string, originalname: string): Promise<any> {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured')

    const client = new Anthropic({ apiKey })

    const base64 = buffer.toString('base64')
    const isPdf = mimetype === 'application/pdf' || (originalname ?? '').toLowerCase().endsWith('.pdf')

    const isImage = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(mimetype)
    if (!isPdf && !isImage) throw new Error(`Tipus de fitxer no suportat: ${mimetype}`)

    const PROMPT = `Ets un expert en factures d'energia espanyoles. Analitza aquesta factura i extreu les dades en format JSON estrictament vàlid.

Extreu aquests camps (usa null si no trobes el valor):
{
  "cups": "codi CUPS (16-22 caràcters, comença per ES)",
  "clientName": "nom complet del client",
  "clientNif": "NIF/CIF del client",
  "clientAddress": "adreça completa del client",
  "currentSupplier": "nom de la comercialitzadora",
  "tariff": "tipus de tarifa (p.ex. 2.0TD, 3.0TD, 6.1TD)",
  "billingPeriodStart": "data inici facturació (YYYY-MM-DD)",
  "billingPeriodEnd": "data fi facturació (YYYY-MM-DD)",
  "totalAmount": número total factura en euros,
  "powerP1": número potència contractada P1 en kW,
  "powerP2": número potència contractada P2 en kW,
  "powerP3": número potència contractada P3 en kW,
  "powerP4": número potència contractada P4 en kW (null si no aplica),
  "powerP5": número potència contractada P5 en kW (null si no aplica),
  "powerP6": número potència contractada P6 en kW (null si no aplica),
  "energyP1": número energia consumida P1 en kWh,
  "energyP2": número energia consumida P2 en kWh,
  "energyP3": número energia consumida P3 en kWh,
  "energyP4": número energia consumida P4 en kWh (null si no aplica),
  "energyP5": número energia consumida P5 en kWh (null si no aplica),
  "energyP6": número energia consumida P6 en kWh (null si no aplica),
  "currentPowerPriceP1": número preu potència P1 en €/kW·any,
  "currentPowerPriceP2": número preu potència P2 en €/kW·any,
  "currentPowerPriceP3": número preu potència P3 en €/kW·any,
  "currentPowerPriceP4": número preu potència P4 (null si no aplica),
  "currentPowerPriceP5": número preu potència P5 (null si no aplica),
  "currentPowerPriceP6": número preu potència P6 (null si no aplica),
  "currentEnergyPriceP1": número preu energia P1 en €/kWh,
  "currentEnergyPriceP2": número preu energia P2 en €/kWh,
  "currentEnergyPriceP3": número preu energia P3 en €/kWh,
  "currentEnergyPriceP4": número preu energia P4 (null si no aplica),
  "currentEnergyPriceP5": número preu energia P5 (null si no aplica),
  "currentEnergyPriceP6": número preu energia P6 (null si no aplica)
}

IMPORTANT: Respon ÚNICAMENT amb el JSON vàlid, sense text addicional, sense markdown, sense \`\`\`.`

    const contentBlock: any = isPdf
      ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } }
      : { type: 'image', source: { type: 'base64', media_type: mimetype as any, data: base64 } }

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: [contentBlock, { type: 'text', text: PROMPT }],
        },
      ],
    })

    const text = (response.content[0] as any).text?.trim() ?? ''

    // Strip possible markdown fences
    const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '')

    try {
      return JSON.parse(cleaned)
    } catch {
      // Try to extract JSON from text
      const match = cleaned.match(/\{[\s\S]*\}/)
      if (match) return JSON.parse(match[0])
      throw new Error('No s\'ha pogut parsejar la resposta de la IA')
    }
  }
}
