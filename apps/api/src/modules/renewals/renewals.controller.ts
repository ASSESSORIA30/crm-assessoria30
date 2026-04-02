import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { RenewalsService } from './renewals.service'

@Controller('renewals')
@UseGuards(JwtAuthGuard)
export class RenewalsController {
  constructor(private service: RenewalsService) {}

  @Get()
  async upcoming(@Query('days') days?: string) {
    return this.service.getUpcoming(days ? parseInt(days) : 7)
  }

  @Get('whatsapp-links')
  async whatsappLinks(@Query('days') days?: string) {
    const clients = await this.service.getUpcoming(days ? parseInt(days) : 7)
    return this.service.generateWhatsAppLinks(clients)
  }

  @Post('send-emails')
  async sendEmails(@Body() body: { clientIds: string[] }) {
    return this.service.sendEmails(body.clientIds)
  }
}
