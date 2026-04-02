import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import Mailjet from 'node-mailjet'

@Injectable()
export class RenewalsService {
  private mailjet: ReturnType<typeof Mailjet.apiConnect>

  constructor(private prisma: PrismaService) {
    this.mailjet = Mailjet.apiConnect(
      process.env.MAILJET_API_KEY ?? '',
      process.env.MAILJET_SECRET_KEY ?? '',
    )
  }

  async getUpcoming(days = 7) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const limit = new Date(today)
    limit.setDate(limit.getDate() + days)

    return this.prisma.client.findMany({
      where: {
        dataRenovacio: { gte: today, lte: limit },
        status: 'active',
      },
      include: {
        supplies: {
          where: { status: 'active' },
          select: { tariff: true, currentSupplier: true, contractEndDate: true, cups: true },
        },
      },
      orderBy: { dataRenovacio: 'asc' },
    })
  }

  generateWhatsAppLinks(clients: any[]): any[] {
    return clients
      .filter((c) => c.phone)
      .map((c) => {
        const supply = c.supplies?.[0]
        const date = c.dataRenovacio
          ? new Date(c.dataRenovacio).toLocaleDateString('ca-ES')
          : 'pròximament'
        const tariff = supply?.tariff ?? 'la teva tarifa actual'
        const supplier = supply?.currentSupplier ?? 'el teu proveïdor'

        const text = [
          `Hola ${c.name}! 👋`,
          `Et recordem que la teva tarifa "${tariff}" amb ${supplier} venç el ${date}.`,
          `Tenim ofertes millors per a tu. Vols que et fem una comparativa gratuïta?`,
          `Contacta'ns per revisar les teves opcions.`,
        ].join('\n')

        const phone = c.phone.replace(/\D/g, '')
        const fullPhone = phone.startsWith('34') ? phone : `34${phone}`

        return {
          clientId: c.id,
          name: c.name,
          phone: c.phone,
          url: `https://wa.me/${fullPhone}?text=${encodeURIComponent(text)}`,
          message: text,
        }
      })
  }

  async sendEmails(clientIds: string[]) {
    const clients = await this.prisma.client.findMany({
      where: { id: { in: clientIds }, email: { not: null } },
      include: {
        supplies: {
          where: { status: 'active' },
          select: { tariff: true, currentSupplier: true, contractEndDate: true },
        },
      },
    })

    const fromEmail = process.env.MAILJET_FROM_EMAIL ?? 'noreply@assessoria30.com'
    const fromName = process.env.MAILJET_FROM_NAME ?? 'Assessoria 3.0'

    const results = await Promise.allSettled(
      clients.map((c) => {
        const supply = c.supplies?.[0]
        const date = c.dataRenovacio
          ? new Date(c.dataRenovacio).toLocaleDateString('ca-ES')
          : 'pròximament'

        return this.mailjet.post('send', { version: 'v3.1' }).request({
          Messages: [{
            From: { Email: fromEmail, Name: fromName },
            To: [{ Email: c.email!, Name: c.name }],
            Subject: `${c.name}, la teva tarifa venç el ${date}`,
            HTMLPart: this.buildEmailHtml(c.name, date, supply?.tariff, supply?.currentSupplier),
          }],
        })
      }),
    )

    return {
      sent: results.filter((r) => r.status === 'fulfilled').length,
      failed: results.filter((r) => r.status === 'rejected').length,
      total: clients.length,
    }
  }

  private buildEmailHtml(name: string, date: string, tariff?: string | null, supplier?: string | null): string {
    return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1e293b;">
  <div style="text-align: center; padding: 24px 0; border-bottom: 2px solid #e2e8f0;">
    <h1 style="font-size: 20px; color: #0f172a; margin: 0;">⚡ Assessoria 3.0</h1>
  </div>
  <div style="padding: 32px 0;">
    <p style="font-size: 16px;">Hola <strong>${name}</strong>,</p>
    <p>Et recordem que la teva tarifa <strong>${tariff ?? 'actual'}</strong> amb <strong>${supplier ?? 'el teu proveïdor'}</strong> venç el <strong>${date}</strong>.</p>
    <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 20px; margin: 24px 0;">
      <p style="margin: 0; font-size: 15px;">🎯 <strong>Tenim ofertes exclusives</strong> que et poden estalviar fins a un <strong>30%</strong> en la teva factura.</p>
    </div>
    <p>Vols que et fem una comparativa gratuïta i sense compromís?</p>
    <div style="text-align: center; margin: 32px 0;">
      <a href="mailto:info@assessoria30.com?subject=Renovació tarifa - ${name}"
         style="background: #2563eb; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px;">
        Sí, vull la meva comparativa!
      </a>
    </div>
    <p style="color: #64748b; font-size: 13px;">Si tens qualsevol dubte, no dubtis en contactar-nos.</p>
  </div>
  <div style="border-top: 1px solid #e2e8f0; padding-top: 16px; text-align: center; color: #94a3b8; font-size: 12px;">
    <p>Assessoria 3.0 — Estalvia en energia i telecomunicacions</p>
  </div>
</body>
</html>`
  }
}
