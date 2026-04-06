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

  /**
   * Parse the official Plantilla_comercializadoras.xlsx template.
   * Sheet "Productos", row 1 = instructions, row 2 = headers, data starts at row 3.
   */
  parseTemplateExcel(buffer: Buffer): ParsedRow[] {
    const wb = XLSX.read(buffer, { type: 'buffer' })
    const sheetName = wb.SheetNames.find(n => n.toLowerCase().includes('producto')) ?? wb.SheetNames[0]
    const sheet = wb.Sheets[sheetName]
    if (!sheet) return []

    // Read as array of arrays starting from row 3 (index 2)
    const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: null, raw: false })

    // Skip first 2 rows (instructions + headers)
    const dataRows = rows.slice(2)

    const parsed: ParsedRow[] = []

    const num = (v: any): number | undefined => {
      if (v == null || v === '') return undefined
      const n = Number(String(v).replace(',', '.').replace(/[^\d.-]/g, ''))
      return isNaN(n) ? undefined : n
    }

    const bool = (v: any): boolean | undefined => {
      if (v == null || v === '') return undefined
      const s = String(v).toLowerCase().trim()
      if (['si', 'sí', 'yes', 'true', '1', 'x'].includes(s)) return true
      if (['no', 'false', '0'].includes(s)) return false
      return undefined
    }

    for (const row of dataRows) {
      // Skip empty rows
      if (!row || row.every((c: any) => c == null || c === '')) continue

      const company = String(row[0] ?? '').trim()
      const productName = String(row[3] ?? '').trim()

      // Required fields
      if (!company || !productName) continue

      parsed.push({
        company,
        serviceType: String(row[1] ?? '').trim(),
        tariffType: String(row[2] ?? '').trim(),
        productName,
        gasPriceFixed: num(row[4]),
        gasPriceVar: num(row[5]),
        powerP1: num(row[6]), powerP2: num(row[7]), powerP3: num(row[8]),
        powerP4: num(row[9]), powerP5: num(row[10]), powerP6: num(row[11]),
        energyP1: num(row[12]), energyP2: num(row[13]), energyP3: num(row[14]),
        energyP4: num(row[15]), energyP5: num(row[16]), energyP6: num(row[17]),
        residential: bool(row[18]),
        pyme: bool(row[19]),
        excedentes: row[20] ? String(row[20]).trim() : undefined,
        priceType: row[21] ? String(row[21]).trim() : undefined,
        feePowerSingle: num(row[22]), feePowerMin: num(row[23]), feePowerMax: num(row[24]),
        feeEnergySingle: num(row[25]), feeEnergyMin: num(row[26]), feeEnergyMax: num(row[27]),
        avgPriceMonth: num(row[28]),
        gasDualTariff: row[29] ? String(row[29]).trim() : undefined,
        gasDualProduct: row[30] ? String(row[30]).trim() : undefined,
      })
    }

    return parsed
  }

  constructor(private prisma: PrismaService) {}

  async importFromExcel(buffer: Buffer, fileName: string, userId?: string) {
    const rows = this.parseTemplateExcel(buffer)
    let imported = 0
    let updated = 0
    let errors = 0
    const errorList: string[] = []

    for (const row of rows) {
      try {
        // Upsert company in the products module too
        await this.prisma.company.upsert({
          where: { nombre: row.company },
          update: {},
          create: { nombre: row.company },
        })

        // Upsert tariff by company + productName
        const existing = await this.prisma.tariff.findFirst({
          where: { company: row.company, productName: row.productName },
        })

        const data = {
          company: row.company,
          tariffType: row.tariffType || null,
          productName: row.productName,
          serviceType: row.serviceType || null,
          gasPriceFixed: row.gasPriceFixed ?? null,
          gasPriceVar: row.gasPriceVar ?? null,
          powerPriceP1: row.powerP1 ?? null,
          powerPriceP2: row.powerP2 ?? null,
          powerPriceP3: row.powerP3 ?? null,
          powerPriceP4: row.powerP4 ?? null,
          powerPriceP5: row.powerP5 ?? null,
          powerPriceP6: row.powerP6 ?? null,
          energyPriceP1: row.energyP1 ?? null,
          energyPriceP2: row.energyP2 ?? null,
          energyPriceP3: row.energyP3 ?? null,
          energyPriceP4: row.energyP4 ?? null,
          energyPriceP5: row.energyP5 ?? null,
          energyPriceP6: row.energyP6 ?? null,
          residential: row.residential ?? null,
          pyme: row.pyme ?? null,
          excedentes: row.excedentes ?? null,
          priceType: row.priceType ?? null,
          feePowerSingle: row.feePowerSingle ?? null,
          feePowerMin: row.feePowerMin ?? null,
          feePowerMax: row.feePowerMax ?? null,
          feeEnergySingle: row.feeEnergySingle ?? null,
          feeEnergyMin: row.feeEnergyMin ?? null,
          feeEnergyMax: row.feeEnergyMax ?? null,
          avgPriceMonth: row.avgPriceMonth ?? null,
          gasDualTariff: row.gasDualTariff ?? null,
          gasDualProduct: row.gasDualProduct ?? null,
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
        this.logger.error(`Error importing ${row.company} - ${row.productName}: ${err.message}`)
      }
    }

    return { imported, updated, errors, total: rows.length, errorList: errorList.slice(0, 10) }
  }
}
