import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { VerifactuService, FacturaData } from './verifactu.service'
import * as PDFDocument from 'pdfkit'
import * as QRCode from 'qrcode'

@Injectable()
export class FacturasService {
  constructor(
    private prisma: PrismaService,
    private verifactu: VerifactuService,
  ) {}

  async getNextNumero(): Promise<string> {
    const year = new Date().getFullYear()
    const last = await this.prisma.factura.findFirst({
      where: { numero: { startsWith: `FACT-${year}-` } },
      orderBy: { numero: 'desc' },
    })
    const seq = last ? parseInt(last.numero.split('-').pop()!) + 1 : 1
    return `FACT-${year}-${String(seq).padStart(4, '0')}`
  }

  async create(data: {
    clientId: string
    linies: Array<{ descripcio: string; quantitat: number; preuUnitari: number }>
    ivaPercentatge?: number
  }) {
    const numero = await this.getNextNumero()
    const iva = data.ivaPercentatge ?? 21
    const baseImponible = data.linies.reduce((sum, l) => sum + l.quantitat * l.preuUnitari, 0)
    const ivaImport = baseImponible * (iva / 100)
    const total = baseImponible + ivaImport
    return this.prisma.factura.create({
      data: {
        numero,
        clientId: data.clientId,
        dataFactura: new Date(),
        baseImponible: Math.round(baseImponible * 100) / 100,
        ivaPercentatge: iva,
        ivaImport: Math.round(ivaImport * 100) / 100,
        total: Math.round(total * 100) / 100,
        linies: data.linies as any,
        estat: 'esborrany',
      },
      include: { client: true },
    })
  }

  async emitAndSubmit(id: string) {
    const factura = await this.prisma.factura.findUnique({
      where: { id },
      include: { client: true },
    })
    if (!factura) throw new Error('Factura not found')

    const previous = await this.prisma.factura.findFirst({
      where: { serie: factura.serie, verifactuHash: { not: null }, createdAt: { lt: factura.createdAt } },
      orderBy: { createdAt: 'desc' },
    })
    const hashAnterior = previous?.verifactuHash ?? ''

    const facturaData: FacturaData = {
      numero: factura.numero,
      serie: factura.serie,
      dataFactura: factura.dataFactura.toISOString().slice(0, 10),
      baseImponible: factura.baseImponible,
      ivaImport: factura.ivaImport,
      total: factura.total,
      clientNif: factura.client.taxId ?? '',
      clientNom: factura.client.name,
    }

    const hash = this.verifactu.generateHash(facturaData, hashAnterior)
    const qrUrl = this.verifactu.generateQrUrl(facturaData)
    const xml = this.verifactu.generateXml(facturaData, hash, hashAnterior)
    const result = await this.verifactu.submitToAeat(xml)
    const estat = result.success ? 'enviada_aeat' : 'error_aeat'

    return this.prisma.factura.update({
      where: { id },
      data: { estat, verifactuHash: hash, verifactuHashAnterior: hashAnterior, verifactuQr: qrUrl, verifactuResposta: result.response },
      include: { client: true },
    })
  }

  async generatePdf(id: string): Promise<Buffer> {
    const factura = await this.prisma.factura.findUnique({ where: { id }, include: { client: true } })
    if (!factura) throw new Error('Factura not found')
    const linies = (factura.linies as any[]) ?? []
    const empresa = {
      nif: process.env.EMPRESA_NIF ?? '',
      nom: process.env.EMPRESA_NOM ?? 'Assessoria 3.0',
      adreca: process.env.EMPRESA_ADRECA ?? '',
      cp: process.env.EMPRESA_CP ?? '',
      poblacio: process.env.EMPRESA_POBLACIO ?? '',
    }
    const fmtMoney = (n: number) => `${n.toFixed(2)} €`
    const fmtDate = (d: Date) => d.toLocaleDateString('ca-ES')

    let qrImage: Buffer | null = null
    if (factura.verifactuQr) {
      qrImage = await QRCode.toBuffer(factura.verifactuQr, { width: 100, margin: 1 })
    }

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 })
      const chunks: Buffer[] = []
      doc.on('data', (c: Buffer) => chunks.push(c))
      doc.on('end', () => resolve(Buffer.concat(chunks)))
      doc.on('error', reject)

      doc.fontSize(18).font('Helvetica-Bold').text(empresa.nom, 50, 50)
      doc.fontSize(9).font('Helvetica').fillColor('#64748b')
        .text(`NIF: ${empresa.nif}`, 50, 75)
        .text(empresa.adreca, 50, 87)
        .text(`${empresa.cp} ${empresa.poblacio}`, 50, 99)

      doc.fontSize(22).font('Helvetica-Bold').fillColor('#1e293b')
        .text('FACTURA', 400, 50, { align: 'right', width: 145 })
      doc.fontSize(11).font('Helvetica').fillColor('#64748b')
        .text(factura.numero, 400, 78, { align: 'right', width: 145 })
        .text(`Data: ${fmtDate(factura.dataFactura)}`, 400, 93, { align: 'right', width: 145 })
        .text(`Sèrie: ${factura.serie}`, 400, 108, { align: 'right', width: 145 })

      doc.moveTo(50, 125).lineTo(545, 125).stroke('#e2e8f0')

      doc.fontSize(10).font('Helvetica-Bold').fillColor('#1e293b').text('Client:', 50, 140)
      doc.font('Helvetica')
        .text(factura.client.name, 50, 155)
        .text(`NIF: ${factura.client.taxId ?? '-'}`, 50, 168)
      if (factura.client.email) doc.text(`Email: ${factura.client.email}`, 50, 181)

      doc.moveTo(50, 200).lineTo(545, 200).stroke('#e2e8f0')

      const tableTop = 215
      const colX = [50, 280, 350, 430, 480]
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#64748b')
        .text('Descripció', colX[0], tableTop)
        .text('Quantitat', colX[1], tableTop, { width: 60, align: 'right' })
        .text('Preu unit.', colX[2], tableTop, { width: 70, align: 'right' })
        .text('IVA', colX[3], tableTop, { width: 40, align: 'right' })
        .text('Import', colX[4], tableTop, { width: 60, align: 'right' })
      doc.moveTo(50, tableTop + 15).lineTo(545, tableTop + 15).stroke('#e2e8f0')

      doc.fillColor('#1e293b').font('Helvetica').fontSize(9)
      let y = tableTop + 25
      for (const l of linies) {
        const lineTotal = (l.quantitat ?? 1) * (l.preuUnitari ?? 0)
        doc.text(l.descripcio ?? '', colX[0], y, { width: 225 })
          .text(String(l.quantitat ?? 1), colX[1], y, { width: 60, align: 'right' })
          .text(fmtMoney(l.preuUnitari ?? 0), colX[2], y, { width: 70, align: 'right' })
          .text(`${factura.ivaPercentatge}%`, colX[3], y, { width: 40, align: 'right' })
          .text(fmtMoney(lineTotal), colX[4], y, { width: 60, align: 'right' })
        y += 18
      }

      y += 15
      doc.moveTo(350, y).lineTo(545, y).stroke('#e2e8f0')
      y += 10
      doc.font('Helvetica').fontSize(10)
        .text('Base imposable:', 350, y, { width: 125, align: 'right' })
        .text(fmtMoney(factura.baseImponible), 480, y, { width: 60, align: 'right' })
      y += 18
      doc.text(`IVA (${factura.ivaPercentatge}%):`, 350, y, { width: 125, align: 'right' })
        .text(fmtMoney(factura.ivaImport), 480, y, { width: 60, align: 'right' })
      y += 18
      doc.moveTo(350, y).lineTo(545, y).stroke('#1e293b')
      y += 10
      doc.font('Helvetica-Bold').fontSize(13)
        .text('TOTAL:', 350, y, { width: 125, align: 'right' })
        .text(fmtMoney(factura.total), 480, y, { width: 60, align: 'right' })

      if (qrImage) doc.image(qrImage, 50, y - 20, { width: 80, height: 80 })

      doc.fontSize(8).font('Helvetica').fillColor('#94a3b8')
        .text('Factura verificable a la AEAT', 50, 750, { align: 'center', width: 495 })
      if (factura.verifactuHash) {
        doc.text(`Hash: ${factura.verifactuHash.slice(0, 32)}...`, 50, 762, { align: 'center', width: 495 })
      }

      doc.end()
    })
  }
}
