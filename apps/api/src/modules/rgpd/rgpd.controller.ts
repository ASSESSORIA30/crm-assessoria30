import { Controller, Post, Body, HttpCode, HttpStatus, Logger } from '@nestjs/common'
import { RgpdService, SendPdfDto } from './rgpd.service'

@Controller('rgpd')
export class RgpdController {
  private readonly logger = new Logger(RgpdController.name)

  constructor(private readonly rgpdService: RgpdService) {}

  /**
   * POST /api/v1/rgpd/send-pdf
   *
   * Rep el PDF en base64 des del formulari RGPD digital i l'envia per email
   * amb el PDF adjunt via SMTP Ionos.
   *
   * Body: { nombre, email_client, email_empresa?, telefono?, pdf_base64, pdf_filename? }
   */
  @Post('send-pdf')
  @HttpCode(HttpStatus.OK)
  async sendPdf(@Body() body: SendPdfDto) {
    this.logger.log(`POST /rgpd/send-pdf — client: ${body?.nombre ?? 'desconegut'}`)
    return this.rgpdService.sendPdfByEmail(body)
  }
}
