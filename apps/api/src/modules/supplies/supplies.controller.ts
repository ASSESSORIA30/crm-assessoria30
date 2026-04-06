import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common'
import { SuppliesService } from './supplies.service'
import { CommissionChainService } from './commission-chain.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { CurrentUser } from '../../common/decorators/current-user.decorator'

@Controller('supplies')
@UseGuards(JwtAuthGuard)
export class SuppliesController {
  constructor(
    private s: SuppliesService,
    private commissions: CommissionChainService,
  ) {}

  @Get()    findAll(@CurrentUser() u: any, @Query() q: any) { return this.s.findAll(u, q) }
  @Post()   create(@CurrentUser() u: any, @Body() dto: any) { return this.s.create(u, dto) }
  @Get(':id') findOne(@CurrentUser() u: any, @Param('id') id: string) { return this.s.findOne(u, id) }
  @Patch(':id') update(@CurrentUser() u: any, @Param('id') id: string, @Body() dto: any) { return this.s.update(u, id, dto) }
  @Delete(':id') remove(@CurrentUser() u: any, @Param('id') id: string) { return this.s.remove(u, id) }
  @Get(':id/comparison-preview') preview(@CurrentUser() u: any, @Param('id') id: string) { return this.s.comparisonPreview(u, id) }

  @Get(':id/commissions')
  commissionChain(@CurrentUser() u: any, @Param('id') id: string) {
    return this.commissions.getForSupply(id, u)
  }

  @Post(':id/commissions/calculate')
  calculateCommissions(@CurrentUser() u: any, @Param('id') id: string, @Body() body: { totalCommission: number }) {
    return this.commissions.calculateAndSave(id, u.id, body.totalCommission)
  }
}
