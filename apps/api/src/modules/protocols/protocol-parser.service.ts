import { Injectable } from '@nestjs/common'
import * as pdfParse from 'pdf-parse'

const PROTOCOL_PROMPT = [
  'You are an expert in commission protocols from energy and telecom providers.',
  'Analyze this document text and extract ALL commissions, tariffs, bonuses and incentives.',
  'Return ONLY a valid JSON object (no markdown, no explanation) with this structure:',
  '{',
  '  "proveedor": "provider/company name",',
  '  "vigencia": { "inicio": "YYYY-MM-DD or null", "fin": "YYYY-MM-DD or null" },',
  '  "productos_baf": [{ "nombre": "product name", "comision": "commission amount/description" }],',
  '  "extra_lotes": "description of batch/lot bonuses or null",',
  '  "fidelizacion_trimestral": "quarterly loyalty bonus description or null",',
  '  "incentivo_conectividad": "connectivity incentive description or null",',
  '  "movil": "mobile commissions description or null",',
  '  "terminales": "terminal/device commissions description or null",',
  '  "tv_max": "TV/max commissions description or null"',
  '}',
  'IMPORTANT: Extract ALL products and commissions found. If a field is not present in the document, set it to null.',
].join('\n')

@Injectable()
export class ProtocolParserService {
  async parseBuffer(buffer: Buffer): Promise<any> {
    const pdf = await pdfParse(buffer)
    const text = pdf.text

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY!,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-5-20250219',
        max_tokens: 4096,
        messages: [{
          role: 'user',
          content: `${PROTOCOL_PROMPT}\n\n--- DOCUMENT TEXT ---\n${text}`,
        }],
      }),
    })

    const data = await response.json()
    const raw = data.content?.[0]?.text ?? '{}'

    try {
      return JSON.parse(raw.replace(/```json|```/g, '').trim())
    } catch {
      return { raw_text: raw, parse_error: true }
    }
  }
}
