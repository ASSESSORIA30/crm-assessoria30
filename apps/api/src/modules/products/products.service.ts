import { Injectable } from '@nestjs/common'
import * as XLSX from 'xlsx'

const PRODUCT_PROMPT = [
  'You are an expert in energy and gas tariffs.',
  'Analyze this document and extract ALL tariffs/products found.',
  'Return ONLY a JSON array (no markdown, no explanation) with this structure:',
  '[{',
  '  "companyia": "company/provider name",',
  '  "nom_tarifa": "tariff/product name",',
  '  "tipus": "llum or gas",',
  '  "preu_kwh": number or null,',
  '  "preu_kw": number or null,',
  '  "peatge": number or null,',
  '  "condicions": "conditions text or null"',
  '}]',
  'IMPORTANT: Create one entry per tariff/product. Extract ALL found in the document.',
  'For preu_kwh, preu_kw and peatge use numeric values (e.g. 0.12) not strings.',
].join('\n')

@Injectable()
export class ProductsService {
  extractTextFromExcel(buffer: Buffer): string {
    const wb = XLSX.read(buffer, { type: 'buffer' })
    const lines: string[] = []
    for (const name of wb.SheetNames) {
      const sheet = wb.Sheets[name]
      const csv = XLSX.utils.sheet_to_csv(sheet)
      lines.push(`--- Sheet: ${name} ---`, csv)
    }
    return lines.join('\n')
  }

  async analyzeWithAI(content: any[]): Promise<any[]> {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        messages: [{ role: 'user', content }],
      }),
    })

    const data = await response.json()
    const raw = data.content?.[0]?.text ?? '[]'

    try {
      const parsed = JSON.parse(raw.replace(/```json|```/g, '').trim())
      return Array.isArray(parsed) ? parsed : [parsed]
    } catch {
      return []
    }
  }

  buildContent(file: any, text?: string): any[] {
    const mediaType = file.mimetype
    const isExcel = mediaType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      || mediaType === 'application/vnd.ms-excel'

    if (isExcel) {
      const excelText = this.extractTextFromExcel(file.buffer)
      return [{ type: 'text', text: `${PRODUCT_PROMPT}\n\n--- DOCUMENT ---\n${excelText}` }]
    }

    const isPdf = mediaType === 'application/pdf'
    const base64 = file.buffer.toString('base64')

    return [
      {
        type: isPdf ? 'document' : 'image',
        source: { type: 'base64', media_type: mediaType, data: base64 },
      },
      { type: 'text', text: PRODUCT_PROMPT },
    ]
  }
}
