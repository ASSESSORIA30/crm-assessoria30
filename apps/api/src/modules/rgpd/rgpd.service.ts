import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as nodemailer from 'nodemailer'
import PDFDocument from 'pdfkit'
import { SubmitRgpdDto } from './dto/submit-rgpd.dto'

@Injectable()
export class RgpdService {
  private readonly logger = new Logger(RgpdService.name)
  private transporter: nodemailer.Transporter

  constructor(private config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host:   this.config.get('SMTP_HOST', 'smtp.ionos.es'),
      port:   Number(this.config.get('SMTP_PORT', '465')),
      secure: true,
      auth: {
        user: this.config.get('SMTP_USER', 'lopd@assessoria30.com'),
        pass: this.config.get('SMTP_PASS'),
      },
    })
  }

  // ─── Submit ──────────────────────────────────────────────────────────────────

  async submitForm(dto: SubmitRgpdDto): Promise<void> {
    const dataAvui = new Date().toLocaleDateString('ca-ES', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    })

    const pdfBuffer  = await this.generatePdf(dto, dataAvui)
    const nomFitxer  = `RGPD_${dto.nom.replace(/\s+/g, '_')}_${dataAvui.replace(/\//g, '-')}.pdf`
    const destinatari = this.config.get('RGPD_EMAIL_TO', 'lopd@assessoria30.com')
    const remitent    = `"Assessoria 3.0 LOPD" <${this.config.get('SMTP_USER', 'lopd@assessoria30.com')}>`

    const attachment = {
      filename: nomFitxer,
      content:  pdfBuffer,
      contentType: 'application/pdf',
    }

    try {
      await this.transporter.sendMail({
        from:        remitent,
        to:          destinatari,
        subject:     `Formulari RGPD - ${dto.nom} - ${dataAvui}`,
        html:        this.emailHtml(dto, dataAvui, true),
        attachments: [attachment],
      })

      await this.transporter.sendMail({
        from:        remitent,
        to:          dto.email,
        subject:     `Copia del vostre consentiment RGPD - Assessoria 3.0`,
        html:        this.emailHtml(dto, dataAvui, false),
        attachments: [attachment],
      })

      this.logger.log(`RGPD enviat OK: ${dto.nom} <${dto.email}>`)
    } catch (err) {
      this.logger.error('Error enviant email RGPD', err)
      throw new InternalServerErrorException(
        "No s'ha pogut enviar el formulari. Torneu-ho a intentar.",
      )
    }
  }

  // ─── PDF ─────────────────────────────────────────────────────────────────────

  private generatePdf(dto: SubmitRgpdDto, dataAvui: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size:    'A4',
        margins: { top: 0, bottom: 50, left: 50, right: 50 },
        info:    { Title: 'Formulari RGPD - Assessoria 3.0', Author: 'Assessoria 3.0' },
      })

      const chunks: Buffer[] = []
      doc.on('data',  c  => chunks.push(c))
      doc.on('end',   () => resolve(Buffer.concat(chunks)))
      doc.on('error', reject)

      const W     = doc.page.width          // 595
      const INNER = W - 100                 // 495 (margin 50 each side)
      const GREEN = '#2a7d4f'
      const DKGRN = '#1a5c38'
      const LGRAY = '#f7faf8'
      const GRAY  = '#555555'

      // ── Header ─────────────────────────────────────────────────────────────
      doc.rect(0, 0, W, 75).fill(GREEN)
      doc
        .font('Helvetica-Bold').fontSize(20).fillColor('#ffffff')
        .text('ASSESSORIA 3.0', 50, 18, { width: INNER })
      doc
        .font('Helvetica').fontSize(10).fillColor('#c8e6d4')
        .text('Formulari de Consentiment RGPD', 50, 44, { width: INNER })
        .text(dataAvui, 50, 44, { width: INNER, align: 'right' })

      // ── Separador verd baix del header ─────────────────────────────────────
      doc.rect(0, 75, W, 4).fill(DKGRN)

      doc.y = 100

      // ── Titol ──────────────────────────────────────────────────────────────
      doc
        .font('Helvetica-Bold').fontSize(14).fillColor(DKGRN)
        .text('DECLARACIO DE CONSENTIMENT INFORMAT', 50, doc.y, {
          width: INNER, align: 'center',
        })
      doc.moveDown(0.3)
      doc
        .font('Helvetica').fontSize(9).fillColor(GRAY)
        .text(
          'Proteccio de dades de caracter personal — RGPD (UE) 2016/679 i LOPDGDD 3/2018',
          50, doc.y, { width: INNER, align: 'center' },
        )
      doc.moveDown(1.2)

      // ── Seccio: Dades del titular ──────────────────────────────────────────
      this.pdfSectionTitle(doc, 'DADES DEL TITULAR', 50, INNER, GREEN)

      const dades: [string, string][] = [
        ['Nom i cognoms',      dto.nom],
        ['Adreca',             dto.adreca],
        ['Poblacio',           dto.poblacio],
        ['Provincia',          dto.provincia],
        ['Correu electronic',  dto.email],
        ['Telefon',            dto.telefon],
      ]

      dades.forEach(([label, value], i) => {
        const rowY = doc.y
        if (i % 2 === 0) doc.rect(50, rowY - 3, INNER, 20).fill(LGRAY)
        doc
          .font('Helvetica-Bold').fontSize(9).fillColor('#333')
          .text(label + ':', 55, rowY, { continued: true, width: 160 })
        doc
          .font('Helvetica').fillColor('#111')
          .text(value || '—', { width: INNER - 160 })
        if (i < dades.length - 1) doc.moveDown(0.15)
      })

      doc.moveDown(1.2)

      // ── Seccio: Consentiments ──────────────────────────────────────────────
      this.pdfSectionTitle(doc, 'CONSENTIMENTS', 50, INNER, GREEN)

      const c1 = dto.consentimentComunicacions ? '[SI]' : '[NO]'
      const c2 = dto.consentimentTrucades       ? '[SI]' : '[NO]'

      doc.rect(50, doc.y - 3, INNER, 20).fill(LGRAY)
      doc
        .font('Helvetica-Bold').fontSize(9)
        .fillColor(dto.consentimentComunicacions ? GREEN : '#cc0000')
        .text(c1, 55, doc.y, { continued: true, width: 40 })
      doc
        .font('Helvetica').fillColor('#222')
        .text(' Accepto rebre comunicacions comercials per correu electronic i altres mitjans.', {
          width: INNER - 40,
        })
      doc.moveDown(0.15)
      doc
        .font('Helvetica-Bold').fontSize(9)
        .fillColor(dto.consentimentTrucades ? GREEN : '#cc0000')
        .text(c2, 55, doc.y, { continued: true, width: 40 })
      doc
        .font('Helvetica').fillColor('#222')
        .text(' Accepto ser contactat/da telefonicament per a fins comercials i d\'assessoria.', {
          width: INNER - 40,
        })

      doc.moveDown(1.2)

      // ── Seccio: Informacio legal ───────────────────────────────────────────
      this.pdfSectionTitle(doc, 'INFORMACIO BASICA DE PROTECCIO DE DADES', 50, INNER, GREEN)

      const legal = [
        ['Responsable',   'ASSESSORIA 3.0 — lopd@assessoria30.com'],
        ['Finalitat',     'Gestio de la relacio comercial i enviament de comunicacions sobre serveis energetics i d\'assessoria.'],
        ['Legitimacio',   'Consentiment exprès de l\'interessat/da (art. 6.1.a RGPD), revocable en qualsevol moment.'],
        ['Conservacio',   'Mentre duri la relacio comercial i durant els terminis legals posteriors.'],
        ['Destinataris',  'No es cediran dades a tercers, excepte per obligacio legal o a prestadors de serveis necessaris.'],
        ['Drets',         'Podeu exercir els drets d\'acces, rectificacio, supressio, portabilitat, limitacio i oposicio escrivint a lopd@assessoria30.com adjuntant copia del DNI.'],
      ]

      legal.forEach(([key, val], i) => {
        const rowY = doc.y
        if (i % 2 === 0) doc.rect(50, rowY - 3, INNER, undefined).fill(LGRAY)
        const startY = doc.y
        doc
          .font('Helvetica-Bold').fontSize(8.5).fillColor(DKGRN)
          .text(key + ':', 55, startY, { continued: true, width: 90 })
        doc
          .font('Helvetica').fillColor('#333')
          .text(' ' + val, { width: INNER - 90 })
        if (i < legal.length - 1) doc.moveDown(0.2)
      })

      doc.moveDown(1.2)

      // ── Seccio: Signatura ──────────────────────────────────────────────────
      // Nova pagina si no hi ha prou espai
      if (doc.y > doc.page.height - 220) doc.addPage()

      this.pdfSectionTitle(doc, 'SIGNATURA DEL TITULAR', 50, INNER, GREEN)

      doc
        .font('Helvetica').fontSize(9).fillColor('#333')
        .text(`Nom: ${dto.nom}`, 55, doc.y)
        .text(`Data: ${dataAvui}`, 55, doc.y + 2)

      doc.moveDown(0.6)
      doc.font('Helvetica').fontSize(9).fillColor('#666').text('Signatura digital:', 55, doc.y)
      doc.moveDown(0.3)

      const sigBoxY = doc.y
      doc.rect(55, sigBoxY, 260, 85).stroke('#cccccc')

      if (dto.signatura?.startsWith('data:image/png;base64,')) {
        try {
          const sigBuf = Buffer.from(dto.signatura.split(',')[1], 'base64')
          doc.image(sigBuf, 60, sigBoxY + 3, { width: 250, height: 79 })
        } catch (_) { /* si la imatge no es valid, deixa la caixa buida */ }
      }

      doc.y = sigBoxY + 95
      doc.moveDown(0.5)

      doc
        .font('Helvetica').fontSize(7.5).fillColor('#888')
        .text(
          `Document generat digitalment el ${dataAvui} mitjancant el formulari RGPD d'Assessoria 3.0.`,
          50, doc.y, { width: INNER, align: 'center' },
        )

      // ── Footer ─────────────────────────────────────────────────────────────
      const footY = doc.page.height - 38
      doc.rect(0, footY, W, 38).fill(GREEN)
      doc
        .font('Helvetica').fontSize(8).fillColor('#c8e6d4')
        .text(
          'ASSESSORIA 3.0  ·  lopd@assessoria30.com  ·  Conforme RGPD (UE) 2016/679 i LOPDGDD 3/2018',
          50, footY + 12, { width: INNER, align: 'center' },
        )

      doc.end()
    })
  }

  private pdfSectionTitle(
    doc: InstanceType<typeof PDFDocument>,
    title: string,
    x: number,
    width: number,
    color: string,
  ) {
    doc.font('Helvetica-Bold').fontSize(10).fillColor(color).text(title, x, doc.y, { width })
    const lineY = doc.y + 2
    doc.moveTo(x, lineY).lineTo(x + width, lineY).lineWidth(1).stroke(color)
    doc.moveDown(0.6)
  }

  // ─── Email HTML ───────────────────────────────────────────────────────────

  private emailHtml(dto: SubmitRgpdDto, dataAvui: string, isInternal: boolean): string {
    const intro = isInternal
      ? `<div style="display:inline-block;background:#2a7d4f;color:#fff;padding:6px 14px;border-radius:4px;font-weight:600;margin-bottom:16px">NOU FORMULARI RGPD REBUT</div>`
      : `<p style="margin:0 0 16px">Hola, <strong>${dto.nom}</strong>!</p>
         <p style="margin:0 0 16px;color:#555">Us enviem la còpia del vostre consentiment RGPD signat el <strong>${dataAvui}</strong>. Guardeu-lo per als vostres registres.</p>`

    const row = (label: string, value: string, bg: boolean) =>
      `<tr style="${bg ? 'background:#f5faf7' : ''}">
        <td style="padding:7px 12px;font-weight:600;width:42%;color:#444">${label}</td>
        <td style="padding:7px 12px;color:#111">${value}</td>
      </tr>`

    return `<!DOCTYPE html>
<html lang="ca"><head><meta charset="UTF-8">
<style>body{font-family:Arial,sans-serif;color:#1a1a1a;margin:0;padding:0}</style>
</head><body>
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f0f0f0;padding:24px 0">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)">
  <tr><td style="background:#2a7d4f;padding:24px 32px">
    <p style="margin:0;font-size:22px;font-weight:700;color:#fff">Assessoria 3.0</p>
    <p style="margin:4px 0 0;font-size:12px;color:#c8e6d4">Formulari RGPD · ${dataAvui}</p>
  </td></tr>
  <tr><td style="padding:28px 32px">
    ${intro}
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:13px;border:1px solid #e8ede8;border-radius:4px;overflow:hidden">
      ${row('Nom i cognoms', dto.nom, false)}
      ${row('Adreça', dto.adreca, true)}
      ${row('Població', dto.poblacio, false)}
      ${row('Província', dto.provincia, true)}
      ${row('Email', dto.email, false)}
      ${row('Telèfon', dto.telefon, true)}
      ${row('Consent. comunicacions', dto.consentimentComunicacions ? '✅ Sí' : '❌ No', false)}
      ${row('Consent. trucades', dto.consentimentTrucades ? '✅ Sí' : '❌ No', true)}
    </table>
    <p style="margin:20px 0 0;font-size:12px;color:#888">El document PDF signat s'adjunta a aquest correu.</p>
  </td></tr>
  <tr><td style="background:#2a7d4f;padding:14px 32px;text-align:center">
    <p style="margin:0;font-size:11px;color:#c8e6d4">Assessoria 3.0 · lopd@assessoria30.com · Formulari RGPD Digital</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`
  }
}
