import { Injectable, Logger, BadRequestException } from '@nestjs/common'
import * as nodemailer from 'nodemailer'

export interface SendPdfDto {
  nombre: string
  email_client: string
  email_empresa?: string
  telefono?: string
  pdf_base64: string
  pdf_filename?: string
  [key: string]: unknown
}

@Injectable()
export class RgpdService {
  private readonly logger = new Logger(RgpdService.name)

  private createTransport() {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST ?? 'smtp.ionos.es',
      port: Number(process.env.SMTP_PORT ?? 465),
      secure: true,
      auth: {
        user: process.env.SMTP_USER ?? 'lopd@assessoria30.com',
        pass: process.env.SMTP_PASS ?? 'Placas.22',
      },
    })
  }

  async sendPdfByEmail(dto: SendPdfDto): Promise<{ success: boolean }> {
    const { nombre, email_client, email_empresa, telefono, pdf_base64, pdf_filename } = dto

    if (!pdf_base64) {
      throw new BadRequestException('El camp pdf_base64 és obligatori')
    }

    // Strip data URI prefix if present (e.g. "data:application/pdf;base64,...")
    const base64Data = pdf_base64.replace(/^data:[^;]+;base64,/, '')
    const pdfBuffer = Buffer.from(base64Data, 'base64')

    if (pdfBuffer.length < 4) {
      throw new BadRequestException('El pdf_base64 no és vàlid')
    }

    const filename = pdf_filename ?? `RGPD_${nombre.replace(/\s+/g, '_')}.pdf`
    const destEmail = process.env.SMTP_TO ?? 'lopd@assessoria30.com'

    const mailOptions: nodemailer.SendMailOptions = {
      from: `"Assessoria 3.0 LOPD" <${process.env.SMTP_USER ?? 'lopd@assessoria30.com'}>`,
      to: destEmail,
      subject: `Formulari RGPD signat — ${nombre}`,
      html: this.buildHtml(nombre, email_client, telefono),
      attachments: [
        {
          filename,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    }

    const transport = this.createTransport()

    try {
      const info = await transport.sendMail(mailOptions)
      this.logger.log(`Email RGPD enviat: ${info.messageId} per a ${nombre} (${email_client})`)
      return { success: true }
    } catch (err: any) {
      this.logger.error(`Error enviant email RGPD: ${err?.message ?? err}`)
      throw err
    } finally {
      transport.close()
    }
  }

  private buildHtml(nombre: string, emailClient: string, telefono?: string): string {
    return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #1e293b;">
  <div style="text-align: center; padding: 24px 0; border-bottom: 2px solid #e2e8f0;">
    <h1 style="font-size: 20px; color: #0f172a; margin: 0;">Assessoria 3.0 — LOPD</h1>
  </div>
  <div style="padding: 32px 0;">
    <p>S'ha rebut un <strong>formulari RGPD signat digitalment</strong>.</p>
    <table style="border-collapse: collapse; width: 100%; margin: 16px 0;">
      <tr>
        <td style="padding: 8px 12px; background: #f8fafc; border: 1px solid #e2e8f0; font-weight: 600; width: 140px;">Nom</td>
        <td style="padding: 8px 12px; border: 1px solid #e2e8f0;">${nombre}</td>
      </tr>
      <tr>
        <td style="padding: 8px 12px; background: #f8fafc; border: 1px solid #e2e8f0; font-weight: 600;">Email client</td>
        <td style="padding: 8px 12px; border: 1px solid #e2e8f0;">${emailClient}</td>
      </tr>
      ${telefono ? `
      <tr>
        <td style="padding: 8px 12px; background: #f8fafc; border: 1px solid #e2e8f0; font-weight: 600;">Telèfon</td>
        <td style="padding: 8px 12px; border: 1px solid #e2e8f0;">${telefono}</td>
      </tr>` : ''}
    </table>
    <p style="color: #64748b; font-size: 13px;">El document PDF signat s'adjunta a aquest correu.</p>
  </div>
  <div style="border-top: 1px solid #e2e8f0; padding-top: 16px; text-align: center; color: #94a3b8; font-size: 12px;">
    <p>Assessoria 3.0 — Sistema de gestió LOPD</p>
  </div>
</body>
</html>`
  }
}
