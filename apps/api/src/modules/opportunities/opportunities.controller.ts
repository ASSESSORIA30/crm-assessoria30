// apps/api/src/modules/opportunities/opportunities.controller.ts
import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common'
import { OpportunitiesService } from './opportunities.service'
import { JwtAuthGuard }         from '../../common/guards/jwt-auth.guard'
import { CurrentUser }          from '../../common/decorators/current-user.decorator'

@Controller('opportunities')
@UseGuards(JwtAuthGuard)
export class OpportunitiesController {
  constructor(private s: OpportunitiesService) {}

  @Get('dashboard')                   dashboard(@CurrentUser() u: any)                                    { return this.s.getDashboard(u) }
  @Get()                              findAll  (@CurrentUser() u: any, @Query() q: any)                   { return this.s.findAll(u, q) }
  @Post()                             create   (@CurrentUser() u: any, @Body()  dto: any)                  { return this.s.create(u, dto) }
  @Get(':id')                         findOne  (@CurrentUser() u: any, @Param('id') id: string)            { return this.s.findOne(u, id) }
  @Patch(':id')                       update   (@CurrentUser() u: any, @Param('id') id: string, @Body() dto: any) { return this.s.update(u, id, dto) }
  @Patch(':id/stage')                 stage    (@CurrentUser() u: any, @Param('id') id: string, @Body() body: any){ return this.s.changeStage(u, id, body) }
  @Post(':id/activities')             activity (@CurrentUser() u: any, @Param('id') id: string, @Body() dto: any) { return this.s.addActivity(u, id, dto) }
  @Delete(':id')                      remove   (@CurrentUser() u: any, @Param('id') id: string)            { return this.s.remove(u, id) }
}
