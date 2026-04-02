import { Injectable, Logger } from '@nestjs/common'
import { google } from 'googleapis'
import { PrismaService } from '../../prisma/prisma.service'
import { ProductsService } from '../products/products.service'
import { OportunitatsService } from '../oportunitats/oportunitats.service'

@Injectable()
export class TariffSyncService {
  private readonly logger = new Logger(TariffSyncService.name)

  constructor(
    private prisma: PrismaService,
    private products: ProductsService,
    private oportunitats: OportunitatsService,
  ) {}

  private getGmailClient() {
    const oauth2 = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
    )
    oauth2.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN })
    return google.gmail({ version: 'v1', auth: oauth2 })
  }

  async syncFromEmail() {
    const gmail = this.getGmailClient()
    const senders = (process.env.TARIFF_SENDERS ?? '').split(',').filter(Boolean)

    if (senders.length === 0) {
      this.logger.warn('No TARIFF_SENDERS configured')
      return { processed: 0, tarifes: 0, opportunities: 0 }
    }

    const query = senders.map((s) => `from:${s.trim()}`).join(' OR ')
    const res = await gmail.users.messages.list({
      userId: 'me',
      q: `${query} is:unread has:attachment`,
      maxResults: 50,
    })

    const messageIds = res.data.messages?.map((m) => m.id!) ?? []
    this.logger.log(`Found ${messageIds.length} unread emails with attachments`)

    let totalTarifes = 0
    let totalOpportunities = 0

    for (const msgId of messageIds) {
      try {
        const msg = await gmail.users.messages.get({
          userId: 'me',
          id: msgId,
        })

        const parts = msg.data.payload?.parts ?? []
        for (const part of parts) {
          if (!part.filename || !part.body?.attachmentId) continue

          const ext = part.filename.toLowerCase()
          const isSupported =
            ext.endsWith('.pdf') ||
            ext.endsWith('.xlsx') ||
            ext.endsWith('.xls') ||
            ext.endsWith('.jpg') ||
            ext.endsWith('.jpeg') ||
            ext.endsWith('.png')
          if (!isSupported) continue

          const attachment = await gmail.users.messages.attachments.get({
            userId: 'me',
            messageId: msgId,
            id: part.body.attachmentId,
          })

          const buffer = Buffer.from(attachment.data.data!, 'base64')
          const mimetype = part.mimeType ?? 'application/octet-stream'

          const fakeFile = {
            buffer,
            mimetype,
            originalname: part.filename,
          }

          const content = this.products.buildContent(fakeFile)
          const extracted = await this.products.analyzeWithAI(content)

          for (const t of extracted) {
            const companyName = (t.companyia ?? t.company ?? 'Desconeguda').trim()
            const company = await this.prisma.company.upsert({
              where: { nombre: companyName },
              update: {},
              create: { nombre: companyName },
            })

            const tarifa = await this.prisma.tarifa.create({
              data: {
                companyId: company.id,
                nombre: t.nom_tarifa ?? t.nombre ?? null,
                tipus: t.tipus ?? null,
                preuKwh: t.preu_kwh != null ? Number(t.preu_kwh) : null,
                preuKw: t.preu_kw != null ? Number(t.preu_kw) : null,
                peatge: t.peatge != null ? Number(t.peatge) : null,
                condicions: t.condicions ?? null,
              },
            })

            const opps = await this.oportunitats.detectOpportunities(tarifa.id)
            totalOpportunities += opps.length
            totalTarifes++
          }
        }

        // Mark as read
        await gmail.users.messages.modify({
          userId: 'me',
          id: msgId,
          requestBody: { removeLabelIds: ['UNREAD'] },
        })
      } catch (err) {
        this.logger.error(`Error processing email ${msgId}:`, err)
      }
    }

    this.logger.log(`Sync complete: ${totalTarifes} tarifes, ${totalOpportunities} opportunities`)
    return { processed: messageIds.length, tarifes: totalTarifes, opportunities: totalOpportunities }
  }
}
