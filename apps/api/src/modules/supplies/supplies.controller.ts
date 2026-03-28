// apps/api/src/modules/supplies/supplies.controller.ts
import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common'
import { SuppliesService } from './supplies.service'
import { JwtAuthGuard }    from '../../common/guards/jwt-auth.guard'
import { CurrentUser }     from '../../common/decorators/current-user.decorator'

@Controller('supplies')
@UseGuards(JwtAuthGuard)
export class SuppliesController {
  constructor(private s: SuppliesService) {}

  @Get()    findAll(@CurrentUser() u: any, @Query() q: any)                   { return this.s.findAll(u, q) }
  @Post()   create (@CurrentUser() u: any, @Body()  dto: any)                  { return this.s.create(u, dto) }
  @Get(':id')      findOne(@CurrentUser() u: any, @Param('id') id: string)    { return this.s.findOne(u, id) }
  @Patch(':id')    update (@CurrentUser() u: any, @Param('id') id: string, @Body() dto: any) { return this.s.update(u, id, dto) }
  @Delete(':id')   remove (@CurrentUser() u: any, @Param('id') id: string)    { return this.s.remove(u, id) }
  @Get(':id/comparison-preview') preview(@CurrentUser() u: any, @Param('id') id: string) { return this.s.comparisonPreview(u, id) }
}
