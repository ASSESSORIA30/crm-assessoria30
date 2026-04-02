import { Controller, Get, Query } from '@nestjs/common'
import { MarketService } from './market.service'

@Controller('market')
export class MarketController {
  constructor(private service: MarketService) {}

  @Get('omip')
  async omip(@Query('commodity') commodity?: string) {
    const data = await this.service.getOmipData()
    if (commodity) {
      return data.filter(c => c.commodity === commodity)
    }
    return data
  }
}
