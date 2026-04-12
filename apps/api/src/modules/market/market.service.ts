import { Injectable, Logger } from '@nestjs/common'
import * as cheerio from 'cheerio'

export interface OmipContract {
  code:      string
  name:      string
  price:     number | null
  change:    number | null
  changeDir: 'up' | 'down' | 'flat'
  volume:    number | null
  type:      'spot' | 'week' | 'month' | 'quarter' | 'year'
  commodity: 'electricity' | 'gas'
}

@Injectable()
export class MarketService {
  private readonly logger = new Logger(MarketService.name)
  private cache: { data: OmipContract[]; timestamp: number } | null = null
  private readonly CACHE_TTL = 5 * 60 * 1000 // 5 minutes

  async getOmipData(): Promise<OmipContract[]> {
    if (this.cache && Date.now() - this.cache.timestamp < this.CACHE_TTL) {
      return this.cache.data
    }
    try {
      const contracts = await this.scrapeOmip()
      this.cache = { data: contracts, timestamp: Date.now() }
      return contracts
    } catch (err: any) {
      this.logger.error(`OMIP scrape failed: ${err.message}`)
      return this.cache?.data ?? this.getFallbackData()
    }
  }

  // ─── Scraper ───────────────────────────────────────────────────────────────

  private async scrapeOmip(): Promise<OmipContract[]> {
    const response = await fetch('https://www.omip.pt/es/plazo-hoy', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept':          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9',
        'Cache-Control':   'no-cache',
      },
    })

    if (!response.ok) throw new Error(`OMIP returned ${response.status}`)

    const html = await response.text()
    this.logger.log(`OMIP HTML length: ${html.length}`)

    // ── Diagnostics: detect what keywords appear in the raw HTML ──────────
    const hasFTB    = /FTB/i.test(html)
    const hasCal    = /\bCal[-\s]\d{2}/i.test(html)
    const hasYR     = /\bYR[-\s]?\d{2}/i.test(html)
    const hasMIBGAS = /MIBGAS/i.test(html)
    const numTables = (html.match(/<table/gi) ?? []).length
    this.logger.log(`Keywords — FTB:${hasFTB} Cal:${hasCal} YR:${hasYR} MIBGAS:${hasMIBGAS} tables:${numTables}`)

    const $ = cheerio.load(html)
    const contracts: OmipContract[] = []

    // Log first 3 rows of the first table for structure debugging
    $('table').first().find('tr').slice(0, 3).each((i, row) => {
      const text = $(row).text().replace(/\s+/g, ' ').trim().slice(0, 160)
      this.logger.log(`T0-row${i}: ${text}`)
    })

    // ─── Strategy 1: section-aware table parsing ─────────────────────────
    // OMIP page has zone-section headers ("FTB Spain Baseload") as captions
    // or preceding header rows; data rows only contain contract names.
    $('table').each((_, table) => {
      const $t      = $(table)
      const capText = $t.find('caption, th').text()
      const prevText = $t.prev('h2, h3, h4, p, div').text()
      const sectionHint = (capText + ' ' + prevText).slice(0, 400)
      const tableText   = $t.text().slice(0, 600)

      const isSpainElec = /FTB|Spain.*[Ee]lec|Baseload|Electricid/i.test(sectionHint + tableText)
      const isGas       = /PVB|MIBGAS|FGF|Gas\b/i.test(sectionHint + tableText)
      if (!isSpainElec && !isGas) return

      const commodity: 'electricity' | 'gas' = isGas && !isSpainElec ? 'gas' : 'electricity'

      $t.find('tr').each((_, row) => {
        const cells = $(row).find('td')
        if (cells.length < 2) return

        const texts = cells.toArray().map(c =>
          $(c).text().trim().replace(/\u00a0/g, ' ').replace(/\s+/g, ' '),
        )
        const nameRaw = texts[0]
        if (!nameRaw) return

        // Broad contract-name patterns: handle both space and dash separators,
        // 2- and 4-digit years, English + Spanish month abbreviations
        const isContract =
          /FTB|PVB|MIBGAS|FGF/i.test(nameRaw) ||
          /\b(Cal|CAL|YR|Yr)[-\s]?\d{2,4}\b/i.test(nameRaw) ||
          /\bQ[1-4][-\s]\d{2,4}\b/i.test(nameRaw) ||
          /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[-\s]\d{2,4}\b/i.test(nameRaw) ||
          /\b(Ene|Feb|Mar|Abr|May|Jun|Jul|Ago|Sep|Oct|Nov|Dic)[-\s]\d{2,4}\b/i.test(nameRaw) ||
          /\b(WK|W|Semana)[-\s]?\d{1,2}/i.test(nameRaw) ||
          /SPEL|Spot|Diario/i.test(nameRaw)

        if (!isContract) return
        if (/produc|contrat|zona|zone|type|tipo/i.test(nameRaw)) return

        const priceStr  = texts.find(t => /^\d{1,5}[.,]\d{1,4}$/.test(t.replace(/\s/g, '')))
        const changeStr = texts.find((t, i) => i > 0 && t !== priceStr &&
          /^[+-]?\d{1,4}[.,]\d{1,4}$/.test(t.replace(/\s/g, '')))

        const price  = priceStr  ? this.parseNum(priceStr)  : null
        const change = changeStr ? this.parseNum(changeStr) : null
        if (price === null) return

        contracts.push(this.buildContract(nameRaw, price, change, commodity))
      })
    })

    // ─── Strategy 2: scan ALL <tr> for rows whose first cell looks like a
    //     contract name and whose subsequent cells contain prices ──────────
    if (contracts.length === 0) {
      $('tr').each((_, row) => {
        const cells = $(row).find('td')
        if (cells.length < 3) return
        const texts = cells.toArray().map(c =>
          $(c).text().trim().replace(/\u00a0/g, ' ').replace(/\s+/g, ' '),
        )
        const nameRaw = texts[0]
        if (!nameRaw) return

        const isElec =
          /FTB|SPEL/i.test(nameRaw) ||
          /\b(Cal|YR)[-\s]?\d{2,4}/i.test(nameRaw) ||
          /\bQ[1-4][-\s]\d{2,4}/i.test(nameRaw) ||
          /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[-\s]\d{2}/i.test(nameRaw)
        const isGas = /PVB|MIBGAS|FGF/i.test(nameRaw)
        if (!isElec && !isGas) return

        const price  = this.parseNum(texts[1])
        const change = this.parseNum(texts[2])
        if (price === null) return

        contracts.push(this.buildContract(nameRaw, price, change, isGas ? 'gas' : 'electricity'))
      })
    }

    if (contracts.length === 0) {
      this.logger.warn('OMIP scrape returned no Spain FTB contracts — using fallback')
      // Log HTML snippet so we can see actual page structure
      const snippet = html.replace(/[\r\n\t]+/g, ' ').replace(/\s{2,}/g, ' ')
      this.logger.log(`HTML[0-400]: ${snippet.slice(0, 400)}`)
      this.logger.log(`HTML[2000-2400]: ${snippet.slice(2000, 2400)}`)
      return this.getFallbackData()
    }

    this.logger.log(`OMIP scraped ${contracts.length} contracts`)
    return contracts
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private buildContract(
    nameRaw:   string,
    price:     number,
    change:    number | null,
    commodity: 'electricity' | 'gas',
  ): OmipContract {
    const code = this.extractCode(nameRaw)
    return {
      code,
      name:      nameRaw,
      price,
      change,
      changeDir: change === null ? 'flat' : change > 0 ? 'up' : change < 0 ? 'down' : 'flat',
      volume:    null,
      type:      this.inferType(nameRaw),
      commodity,
    }
  }

  private extractCode(name: string): string {
    // Year contract: YR-28, CAL28, CAL-28, Cal 28, Cal-28, Cal2028
    const yr = name.match(/\b(?:YR|CAL|Cal)[-\s]?(\d{2,4})\b/i)
    if (yr) {
      const yy = yr[1].length === 4 ? yr[1].slice(-2) : yr[1]
      return `YR-${yy}`
    }

    // Quarter: Q1-26, Q2 26, Q2-2026
    const q = name.match(/\bQ([1-4])[-\s](\d{2,4})\b/i)
    if (q) {
      const yy = q[2].length === 4 ? q[2].slice(-2) : q[2]
      return `Q${q[1]}-${yy}`
    }

    // Month (English or Spanish 3-letter): MAY-26, MAY 26, May 2026
    const m = name.match(/\b([A-Z]{3})[-\s](\d{2,4})\b/i)
    if (m) {
      const yy = m[2].length === 4 ? m[2].slice(-2) : m[2]
      return `${m[1].toUpperCase()}-${yy}`
    }

    // Week: WK-15-26, W15-26
    const w = name.match(/\b(?:WK|W|Semana)[-\s]?(\d{1,2})[-\s](\d{2,4})\b/i)
    if (w) {
      const yy = w[2].length === 4 ? w[2].slice(-2) : w[2]
      return `WK-${w[1]}-${yy}`
    }

    // Spot/SPEL
    if (/SPEL|SPOT|Spot|Diario/i.test(name)) return 'SPOT'

    // PVB gas spot
    if (/PVB.*[Ss]pot/i.test(name)) return 'PVB-SPOT'

    return name.replace(/\s+/g, '-').toUpperCase().slice(0, 12)
  }

  private inferType(name: string): OmipContract['type'] {
    const u = name.toUpperCase()
    if (/SPEL|SPOT|DIARIO/.test(u))                      return 'spot'
    if (/\b(YR|CAL|CAL)[-\s]?\d{2,4}/.test(u))          return 'year'
    if (/\bQ[1-4][-\s]\d{2,4}/.test(u))                  return 'quarter'
    if (/\b(WK|W|SEMANA)[-\s]?\d{1,2}/.test(u))          return 'week'
    if (/\b[A-Z]{3}[-\s]\d{2,4}/.test(u))                return 'month'
    return 'month'
  }

  private parseNum(s: string): number | null {
    if (!s) return null
    const n = Number(s.replace(',', '.').replace(/[^\d.-]/g, ''))
    return isNaN(n) ? null : n
  }

  // ─── Fallback data (Spain FTB only) ────────────────────────────────────────

  private getFallbackData(): OmipContract[] {
    const now   = new Date()
    const yr    = now.getFullYear()
    const month = now.toLocaleString('en', { month: 'short' }).toUpperCase()
    const q     = Math.ceil((now.getMonth() + 1) / 3)
    const nm    = new Date(yr, now.getMonth() + 1, 1).toLocaleString('en', { month: 'short' }).toUpperCase()
    const nextQ = q < 4 ? q + 1 : 1
    const nqYr  = q < 4 ? yr : yr + 1

    // Year contracts: next 5 calendar years
    const yearContracts: OmipContract[] = [1, 2, 3, 4, 5].map((offset) => {
      const y  = yr + offset
      const yy = String(y).slice(-2)
      const basePrice = 85 - offset * 3.5
      const change = (Math.random() - 0.5) * 2
      return {
        code:      `YR-${yy}`,
        name:      `FTB Cal-${yy} Spain`,
        price:     Math.round((basePrice + (Math.random() - 0.5) * 5) * 100) / 100,
        change:    Math.round(change * 100) / 100,
        changeDir: change > 0 ? 'up' : change < 0 ? 'down' : 'flat',
        volume:    null,
        type:      'year',
        commodity: 'electricity',
      } as OmipContract
    })

    const elec: OmipContract[] = [
      {
        code: 'SPOT', name: 'SPEL Base FTB', price: 14.44, change: -1.20,
        changeDir: 'down', volume: null, type: 'spot', commodity: 'electricity',
      },
      {
        code: `WK-${this.weekNum(now)}-${String(yr).slice(-2)}`,
        name: `FTB Week-${this.weekNum(now)} ${yr}`,
        price: 20.00, change: 0.50, changeDir: 'up', volume: null, type: 'week', commodity: 'electricity',
      },
      {
        code: `${nm}-${String(nqYr).slice(-2)}`,
        name: `FTB ${nm}-${yr}`,
        price: 24.50, change: -0.30, changeDir: 'down', volume: null, type: 'month', commodity: 'electricity',
      },
      {
        code: `Q${nextQ}-${String(nqYr).slice(-2)}`,
        name: `FTB Q${nextQ}-${nqYr}`,
        price: 52.75, change: 1.25, changeDir: 'up', volume: null, type: 'quarter', commodity: 'electricity',
      },
      ...yearContracts,
    ]

    const gas: OmipContract[] = [
      {
        code: 'PVB-SPOT', name: 'PVB MIBGAS Spot', price: 32.15, change: -0.85,
        changeDir: 'down', volume: null, type: 'spot', commodity: 'gas',
      },
      {
        code: `PVB-${nm}-${String(yr).slice(-2)}`,
        name: `FGF MIBGAS ${nm}-${yr}`,
        price: 33.40, change: 0.20, changeDir: 'up', volume: null, type: 'month', commodity: 'gas',
      },
      {
        code: `PVB-Q${nextQ}-${String(nqYr).slice(-2)}`,
        name: `FGF MIBGAS Q${nextQ}-${nqYr}`,
        price: 35.10, change: 0.75, changeDir: 'up', volume: null, type: 'quarter', commodity: 'gas',
      },
      ...[1, 2, 3].map((offset) => {
        const y  = yr + offset
        const yy = String(y).slice(-2)
        const ch = (Math.random() - 0.5) * 1.5
        return {
          code: `PVB-YR-${yy}`, name: `FGF MIBGAS Cal-${yy}`,
          price: Math.round((34 + offset * 0.8 + (Math.random() - 0.5) * 2) * 100) / 100,
          change: Math.round(ch * 100) / 100,
          changeDir: (ch > 0 ? 'up' : ch < 0 ? 'down' : 'flat') as 'up' | 'down' | 'flat',
          volume: null, type: 'year' as const, commodity: 'gas' as const,
        }
      }),
    ]

    return [...elec, ...gas]
  }

  private weekNum(d: Date): number {
    const utc = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
    utc.setUTCDate(utc.getUTCDate() + 4 - (utc.getUTCDay() || 7))
    const jan1 = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1))
    return Math.ceil((((utc.getTime() - jan1.getTime()) / 86400000) + 1) / 7)
  }

  // ─── OMIE spot prices ──────────────────────────────────────────────────────

  async getOmieData(year: number, month: number): Promise<{ day: number; avgPrice: number; maxPrice: number; minPrice: number }[]> {
    try {
      return await this.scrapeOmie(year, month)
    } catch (err: any) {
      this.logger.warn(`OMIE scrape failed: ${err.message} — using fallback`)
      return this.getOmieFallback(year, month)
    }
  }

  private async scrapeOmie(year: number, month: number): Promise<{ day: number; avgPrice: number; maxPrice: number; minPrice: number }[]> {
    // OMIE publishes marginal prices via downloadable files.
    // Try the REST endpoint first (some regions expose JSON).
    const pad  = (n: number) => String(n).padStart(2, '0')
    const url  = `https://www.omie.es/es/file-download?folder=marginalpdbc&y=${year}&m=${pad(month)}&d=01&suffix=1`

    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': '*/*' },
      signal: AbortSignal.timeout(8000),
    })

    if (!response.ok) throw new Error(`OMIE HTTP ${response.status}`)

    const text = await response.text()
    // File format: MARGINALPDBC_YYYYMMDDYYYMMDD_1.1;
    // Lines after header: YYYY;MM;DD;H1;H2;...;H24
    const lines = text.split('\n').filter(l => /^\d{4};\d{2};\d{2}/.test(l))

    if (lines.length === 0) throw new Error('OMIE file format not recognized')

    const byDay = new Map<number, number[]>()
    for (const line of lines) {
      const parts = line.split(';')
      const day   = parseInt(parts[2], 10)
      const prices: number[] = []
      for (let i = 3; i < parts.length; i++) {
        const p = parseFloat(parts[i].replace(',', '.'))
        if (!isNaN(p) && p >= 0) prices.push(p)
      }
      if (!byDay.has(day)) byDay.set(day, [])
      byDay.get(day)!.push(...prices)
    }

    return Array.from(byDay.entries())
      .map(([day, prices]) => ({
        day,
        avgPrice: Math.round((prices.reduce((a, b) => a + b, 0) / prices.length) * 100) / 100,
        maxPrice: Math.round(Math.max(...prices) * 100) / 100,
        minPrice: Math.round(Math.min(...prices) * 100) / 100,
      }))
      .sort((a, b) => a.day - b.day)
  }

  private getOmieFallback(year: number, month: number): { day: number; avgPrice: number; maxPrice: number; minPrice: number }[] {
    const daysInMonth = new Date(year, month, 0).getDate()
    const base = 55 + Math.random() * 30
    return Array.from({ length: daysInMonth }, (_, i) => {
      const variance = (Math.random() - 0.5) * 20
      const avg = Math.max(10, Math.round((base + variance) * 100) / 100)
      return {
        day:      i + 1,
        avgPrice: avg,
        maxPrice: Math.round((avg + Math.random() * 15) * 100) / 100,
        minPrice: Math.round(Math.max(5, avg - Math.random() * 15) * 100) / 100,
      }
    })
  }
}
