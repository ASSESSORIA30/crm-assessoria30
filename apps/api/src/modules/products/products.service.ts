import { Injectable, Logger } from '@nestjs/common'
import * as XLSX from 'xlsx'
import { PrismaService } from '../../prisma/prisma.service'

/**
 * ZocoProductos V1.3 column mapping (0-indexed):
 * A(0)=company  B(1)=serviceType  C(2)=tariffType  D(3)=productName
 * E-F skip (cols 4-5)
 * G(6)..L(11) = powerPriceP1..P6
 * M(12)..R(17) = energyPriceP1..P6
 * S(18)=residential  T(19)=pyme  U(20)=excedentes  V(21)=priceType
 * W(22)=feePowerSingle  X(23)=feePowerMin  Y(24)=feePowerMax
 * Z(25)=feeEnergySingle  AA(26)=feeEnergyMin  AB(27)=feeEnergyMax
 */
interface ParsedRow {
  company:      string
  serviceType:  string
  tariffType:   string
  productName:  string
  powerPriceP1?: number; powerPriceP2?: number; powerPriceP3?: number
  powerPriceP4?: number; powerPriceP5?: number; powerPriceP6?: number
  energyPriceP1?: number; energyPriceP2?: number; energyPriceP3?: number
  energyPriceP4?: number; energyPriceP5?: number; energyPriceP6?: number
  residential?:    boolean
  pyme?:           boolean
  excedentes?:     string
  priceType?:      string
  feePowerSingle?: number; feePowerMin?: number; feePowerMax?: number
  feeEnergySingle?: number; feeEnergyMin?: number; feeEnergyMax?: number
}

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name)

  constructor(private prisma: PrismaService) {}

  /**
   * Parse ZocoProductos V1.3.
   * Rows 1-2 are headers → skip (slice(2)).
   * Data starts at row 3.
   * Skip rows where col A or col D are null/empty or start with '='.
   * Stop at first completely empty row.
   */
  parseExcel(buffer: Buffer): ParsedRow[] {
    const wb = XLSX.read(buffer, { type: 'buffer' })
    const sheetName =
      wb.SheetNames.find(n => n.toLowerCase().includes('product')) ??
      wb.SheetNames[0]
    const sheet = wb.Sheets[sheetName]
    if (!sheet) return []

    const rows: any[][] = XLSX.utils.sheet_to_json(sheet, {
      header: 1, defval: null, raw: true,
    })

    const isFormula = (v: any) => typeof v === 'string' && v.startsWith('=')

    const str = (v: any): string => {
      if (v == null || isFormula(v)) return ''
      return String(v).trim()
    }

    const num = (v: any): number | undefined => {
      if (v == null || v === '' || isFormula(v)) return undefined
      if (typeof v === 'number') return v
      const n = Number(String(v).replace(',', '.').replace(/[^\d.-]/g, ''))
      return isNaN(n) ? undefined : n
    }

    const bool = (v: any): boolean | undefined => {
      if (v == null || isFormula(v)) return undefined
      const s = String(v).toLowerCase().trim()
      return ['si', 'sí', 'yes', 'true', '1', 'x'].includes(s)
    }

    const parsed: ParsedRow[] = []

    for (const row of rows.slice(2)) {               // skip rows 1-2 (headers)
      if (!row || row.every(c => c == null || c === '')) break  // stop at blank row

      const company     = str(row[0])   // A
      const productName = str(row[3])   // D
      if (!company || !productName) continue  // skip if A or D null/formula

      parsed.push({
        company,
        serviceType:    str(row[1]),          // B
        tariffType:     str(row[2]),          // C
        productName,
        powerPriceP1:   num(row[6]),          // G
        powerPriceP2:   num(row[7]),          // H
        powerPriceP3:   num(row[8]),          // I
        powerPriceP4:   num(row[9]),          // J
        powerPriceP5:   num(row[10]),         // K
        powerPriceP6:   num(row[11]),         // L
        energyPriceP1:  num(row[12]),         // M
        energyPriceP2:  num(row[13]),         // N
        energyPriceP3:  num(row[14]),         // O
        energyPriceP4:  num(row[15]),         // P
        energyPriceP5:  num(row[16]),         // Q
        energyPriceP6:  num(row[17]),         // R
        residential:    bool(row[18]),        // S
        pyme:           bool(row[19]),        // T
        excedentes:     str(row[20]) || undefined, // U
        priceType:      str(row[21]) || undefined, // V
        feePowerSingle: num(row[22]),         // W
        feePowerMin:    num(row[23]),         // X
        feePowerMax:    num(row[24]),         // Y
        feeEnergySingle: num(row[25]),        // Z
        feeEnergyMin:   num(row[26]),         // AA
        feeEnergyMax:   num(row[27]),         // AB
      })
    }

    return parsed
  }

  async importFromExcel(buffer: Buffer, fileName: string, userId?: string) {
    const rows = this.parseExcel(buffer)
    let imported = 0
    let updated  = 0
    let errors   = 0
    const errorList: string[] = []

    for (const row of rows) {
      try {
        const data = {
          company:        row.company,
          serviceType:    row.serviceType   || null,
          tariffType:     row.tariffType    || null,
          productName:    row.productName,
          powerPriceP1:   row.powerPriceP1  ?? null,
          powerPriceP2:   row.powerPriceP2  ?? null,
          powerPriceP3:   row.powerPriceP3  ?? null,
          powerPriceP4:   row.powerPriceP4  ?? null,
          powerPriceP5:   row.powerPriceP5  ?? null,
          powerPriceP6:   row.powerPriceP6  ?? null,
          energyPriceP1:  row.energyPriceP1 ?? null,
          energyPriceP2:  row.energyPriceP2 ?? null,
          energyPriceP3:  row.energyPriceP3 ?? null,
          energyPriceP4:  row.energyPriceP4 ?? null,
          energyPriceP5:  row.energyPriceP5 ?? null,
          energyPriceP6:  row.energyPriceP6 ?? null,
          residential:    row.residential   ?? null,
          pyme:           row.pyme          ?? null,
          excedentes:     row.excedentes    ?? null,
          priceType:      row.priceType     ?? null,
          feePowerSingle: row.feePowerSingle ?? null,
          feePowerMin:    row.feePowerMin   ?? null,
          feePowerMax:    row.feePowerMax   ?? null,
          feeEnergySingle: row.feeEnergySingle ?? null,
          feeEnergyMin:   row.feeEnergyMin  ?? null,
          feeEnergyMax:   row.feeEnergyMax  ?? null,
          fileName,
          createdBy: userId ?? null,
        }

        // Upsert by (company, productName)
        const existing = await this.prisma.tariff.findFirst({
          where: { company: row.company, productName: row.productName },
          select: { id: true },
        })

        if (existing) {
          await this.prisma.tariff.update({ where: { id: existing.id }, data })
          updated++
        } else {
          await this.prisma.tariff.create({ data })
          imported++
        }
      } catch (err: any) {
        errors++
        const msg = `${row.company} – ${row.productName}: ${err.message}`
        errorList.push(msg)
        this.logger.error(`importFromExcel: ${msg}`)
      }
    }

    return { imported, updated, errors, total: rows.length, errorList: errorList.slice(0, 10) }
  }
}
