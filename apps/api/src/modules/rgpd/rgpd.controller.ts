import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common'
import { RgpdService } from './rgpd.service'
import { SubmitRgpdDto } from './dto/submit-rgpd.dto'

@Controller('rgpd')
export class RgpdController {
  constructor(private readonly rgpdService: RgpdService) {}

  @Post('submit')
  @HttpCode(HttpStatus.OK)
  async submit(@Body() dto: SubmitRgpdDto) {
    await this.rgpdService.submitForm(dto)
    return { ok: true, message: 'Formulari RGPD enviat correctament.' }
  }
}
