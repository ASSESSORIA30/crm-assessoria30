import { Controller, Get, Query } from '@nestjs/common'
import { MarketService } from './market.service'

@Controller('market')
export class MarketController {
  constructor(private service: MarketService) {}

  @Get('omip')
  async omip(@Query('commodity') commodity?: string) {
    const data = await this.service.getOmipData()
    if (commodity) return data.filter(c => c.commodity === commodity)
    return data
  }

  @Get('omie')
  async omie(@Query('year') year?: string, @Query('month') month?: string) {
    return this.service.getOmieData(
      year  ? Number(year)  : new Date().getFullYear(),
      month ? Number(month) : new Date().getMonth() + 1,
    )
  }
}
