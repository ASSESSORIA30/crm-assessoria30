import { Injectable, Logger } from '@nestjs/common'
import * as XLSX from 'xlsx'
import { PrismaService } from '../../prisma/prisma.service'

interface ParsedRule {
  consumoMin:  number | null
  consumoMax:  number | null
  potenciaMin: number | null
  potenciaMax: number | null
  comision:    number
  multiplicar: boolean
}

@Injectable()
export class CommissionsService {
  private readonly logger = new Logger(CommissionsService.name)

  constructor(private prisma: PrismaService) {}

  /**
   * Parse ZocoComisiones V1.0:
   * Sheet 'Productos':
   *   Row 3 col C  → commission type
   *   Rows 5-6     → headers (skip)
   *   Row 7+       → data (stop at first fully empty row)
   * Columns: A=consumoMin, B=consumoMax, C=potenciaMin, D=potenciaMax,
   *          E=comision, F=multiplicar (Si/No)
   */
  parseExcel(buffer: Buffer): { type: string; rules: ParsedRule[] } {
    const wb = XLSX.read(buffer, { type: 'buffer' })
    const sheetName =
      wb.SheetNames.find(n => n.toLowerCase().includes('producto')) ??
      wb.SheetNames[0]
    const sheet = wb.Sheets[sheetName]
    if (!sheet) return { type: '', rules: [] }

    const rows: any[][] = XLSX.utils.sheet_to_json(sheet, {
      header: 1, defval: null, raw: true,
    })

    // Row 3 (0-indexed: 2), col C (0-indexed: 2) = commission type
    const type = String(rows[2]?.[2] ?? '').trim()

    const isFormula = (v: any) => typeof v === 'string' && v.startsWith('=')

    const num = (v: any): number | null => {
      if (v == null || v === '' || isFormula(v)) return null
      if (typeof v === 'number') return v
      const n = Number(String(v).replace(',', '.').replace(/[^\d.-]/g, ''))
      return isNaN(n) ? null : n
    }

    const bool = (v: any): boolean => {
      if (v == null || isFormula(v)) return false
      const s = String(v).toLowerCase().trim()
      return ['si', 'sí', 'yes', 'true', '1', 'x'].includes(s)
    }

    // Data starts at row 7 (0-indexed: 6) — rows 5-6 are headers
    const dataRows = rows.slice(6)
    const rules: ParsedRule[] = []

    for (const row of dataRows) {
      if (!row || row.every((c: any) => c == null || c === '')) break
      const comision = num(row[4])
      if (comision == null) continue
      rules.push({
        consumoMin:  num(row[0]),
        consumoMax:  num(row[1]),
        potenciaMin: num(row[2]),
        potenciaMax: num(row[3]),
        comision,
        multiplicar: bool(row[5]),
      })
    }

    return { type, rules }
  }

  async uploadRules(buffer: Buffer, fileName: string, userId?: string) {
    const { type, rules } = this.parseExcel(buffer)

    if (!type || rules.length === 0) {
      return { imported: 0, total: 0, type, error: 'No s\'han trobat regles al fitxer' }
    }

    // Replace all rules of this type (delete + insert)
    await this.prisma.commissionRule.deleteMany({ where: { type } })

    await this.prisma.commissionRule.createMany({
      data: rules.map(r => ({
        type,
        consumoMin:  r.consumoMin,
        consumoMax:  r.consumoMax,
        potenciaMin: r.potenciaMin,
        potenciaMax: r.potenciaMax,
        comision:    r.comision,
        multiplicar: r.multiplicar,
        fileName,
        createdBy: userId ?? null,
      })),
    })

    return { imported: rules.length, total: rules.length, type }
  }

  async getRules(type?: string) {
    return this.prisma.commissionRule.findMany({
      where: type ? { type } : undefined,
      orderBy: [{ type: 'asc' }, { consumoMin: 'asc' }],
    })
  }
}
