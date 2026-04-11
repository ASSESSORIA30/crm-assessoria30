import { Injectable, Logger } from '@nestjs/common'
import * as XLSX from 'xlsx'
import { PrismaService } from '../../prisma/prisma.service'

interface ParsedRow {
  company: string
  serviceType: string
  tariffType: string
  productName: string
  gasPriceFixed?: number
  gasPriceVar?: number
  powerP1?: number; powerP2?: number; powerP3?: number
  powerP4?: number; powerP5?: number; powerP6?: number
  energyP1?: number; energyP2?: number; energyP3?: number
  energyP4?: number; energyP5?: number; energyP6?: number
  residential?: boolean
  pyme?: boolean
  excedentes?: string
  priceType?: string
  feePowerSingle?: number; feePowerMin?: number; feePowerMax?: number
  feeEnergySingle?: number; feeEnergyMin?: number; feeEnergyMax?: number
  avgPriceMonth?: number
  gasDualTariff?: string
  gasDualProduct?: string
}

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name)

  constructor(private prisma: PrismaService) {}

  /**
   * Parse ZocoProductos V1.3 template.
   * Row 1 = section titles (skip), Row 2 = column headers (skip), Row 3+ = data.
   * Stop at first completely empty row.
   */
  parseTemplateExcel(buffer: Buffer): ParsedRow[] {
    const wb = XLSX.read(buffer, { type: 'buffer' })
    const sheetName = wb.SheetNames.find(n => n.toLowerCase().includes('producto')) ?? wb.SheetNames[0]
    const sheet = wb.Sheets[sheetName]
    if (!sheet) return []

    // raw: true → numbers come back as numbers, not formatted strings
    const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: true })

    // Skip first 2 rows (section titles + column headers)
    const dataRows = rows.slice(2)

    // Returns undefined if value is null, empty, or an Excel formula string
    const isFormula = (v: any) => typeof v === 'string' && v.startsWith('=')

    const str = (v: any): string => {
      if (v == null || isFormula(v)) return ''
      return String(v).trim()
    }

    const num = (v: any): number | undefined => {
      if (v == null || v === '' || isFormula(v)) return undefined
      if (typeof v === 'number') return v
      // Accept both dot and comma as decimal separator
      const n = Number(String(v).replace(',', '.').replace(/[^\d.-]/g, ''))
      return isNaN(n) ? undefined : n
    }

    const bool = (v: any): boolean | undefined => {
      if (v == null || v === '' || isFormula(v)) return undefined
      const s = String(v).toLowerCase().trim()
      if (['si', 'sí', 'yes', 'true', '1', 'x'].includes(s)) return true
      return false
    }

    const parsed: ParsedRow[] = []

    for (const row of dataRows) {
      // STOP (not skip) at first completely empty row
      if (!row || row.every((c: any) => c == null || c === '')) break

      const company = str(row[0])   // A: Comercializadora
      const productName = str(row[3]) // D: Producto

      // Skip rows without required fields (e.g. sub-header rows mid-sheet)
      if (!company || !productName) continue

      parsed.push({
        company,
        serviceType:   str(row[1]),   // B: Tipo
        tariffType:    str(row[2]),   // C: Tarifa
        productName,
        gasPriceFixed: num(row[4]),   // E
        gasPriceVar:   num(row[5]),   // F
        powerP1: num(row[6]),  powerP2: num(row[7]),  powerP3: num(row[8]),  // G-I
        powerP4: num(row[9]),  powerP5: num(row[10]), powerP6: num(row[11]), // J-L
        energyP1: num(row[12]), energyP2: num(row[13]), energyP3: num(row[14]), // M-O
        energyP4: num(row[15]), energyP5: num(row[16]), energyP6: num(row[17]), // P-R
        residential:    bool(row[18]), // S
        pyme:           bool(row[19]), // T
        excedentes:     str(row[20]) || undefined, // U
        priceType:      str(row[21]) || undefined, // V
        feePowerSingle: num(row[22]), feePowerMin: num(row[23]), feePowerMax: num(row[24]), // W-Y
        feeEnergySingle: num(row[25]), feeEnergyMin: num(row[26]), feeEnergyMax: num(row[27]), // Z-AB
        avgPriceMonth:  num(row[28]), // AC
        gasDualTariff:  str(row[29]) || undefined, // AD
        gasDualProduct: str(row[30]) || undefined, // AE
      })
    }

    return parsed
  }

  async importFromExcel(buffer: Buffer, fileName: string, userId?: string) {
    const rows = this.parseTemplateExcel(buffer)
    let imported = 0
    let updated = 0
    let errors = 0
    const errorList: string[] = []

    for (const row of rows) {
      try {
        // Ensure company exists
        await this.prisma.company.upsert({
          where:  { nombre: row.company },
          update: {},
          create: { nombre: row.company },
        })

        // Upsert tariff by (company, productName)
        const existing = await this.prisma.tariff.findFirst({
          where: { company: row.company, productName: row.productName },
        })

        const data = {
          company:      row.company,
          tariffType:   row.tariffType   || null,
          productName:  row.productName,
          serviceType:  row.serviceType  || null,
          gasPriceFixed:  row.gasPriceFixed  ?? null,
          gasPriceVar:    row.gasPriceVar    ?? null,
          powerPriceP1:   row.powerP1 ?? null,
          powerPriceP2:   row.powerP2 ?? null,
          powerPriceP3:   row.powerP3 ?? null,
          powerPriceP4:   row.powerP4 ?? null,
          powerPriceP5:   row.powerP5 ?? null,
          powerPriceP6:   row.powerP6 ?? null,
          energyPriceP1:  row.energyP1 ?? null,
          energyPriceP2:  row.energyP2 ?? null,
          energyPriceP3:  row.energyP3 ?? null,
          energyPriceP4:  row.energyP4 ?? null,
          energyPriceP5:  row.energyP5 ?? null,
          energyPriceP6:  row.energyP6 ?? null,
          residential:    row.residential ?? null,
          pyme:           row.pyme        ?? null,
          excedentes:     row.excedentes  ?? null,
          priceType:      row.priceType   ?? null,
          feePowerSingle: row.feePowerSingle ?? null,
          feePowerMin:    row.feePowerMin    ?? null,
          feePowerMax:    row.feePowerMax    ?? null,
          feeEnergySingle: row.feeEnergySingle ?? null,
          feeEnergyMin:   row.feeEnergyMin    ?? null,
          feeEnergyMax:   row.feeEnergyMax    ?? null,
          avgPriceMonth:  row.avgPriceMonth   ?? null,
          gasDualTariff:  row.gasDualTariff   ?? null,
          gasDualProduct: row.gasDualProduct  ?? null,
          fileName,
          createdBy: userId ?? null,
        }

        if (existing) {
          await this.prisma.tariff.update({ where: { id: existing.id }, data })
          updated++
        } else {
          await this.prisma.tariff.create({ data })
          imported++
        }
      } catch (err: any) {
        errors++
        errorList.push(`${row.company} - ${row.productName}: ${err.message}`)
        this.logger.error(`Import error ${row.company} - ${row.productName}: ${err.message}`)
      }
    }

    return { imported, updated, errors, total: rows.length, errorList: errorList.slice(0, 10) }
  }
}
