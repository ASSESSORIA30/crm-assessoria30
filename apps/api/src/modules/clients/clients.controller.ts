// apps/api/src/modules/clients/clients.controller.ts
import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards } from '@nestjs/common'
import { ClientsService } from './clients.service'
import { JwtAuthGuard }   from '../../common/guards/jwt-auth.guard'
import { CurrentUser }    from '../../common/decorators/current-user.decorator'

@Controller('clients')
@UseGuards(JwtAuthGuard)
export class ClientsController {
  constructor(private service: ClientsService) {}

  @Get()
  findAll(@CurrentUser() u: any, @Query() q: any) { return this.service.findAll(u, q) }

  @Post()
  create(@CurrentUser() u: any, @Body() dto: any) { return this.service.create(u, dto) }

  @Get(':id')
  findOne(@CurrentUser() u: any, @Param('id') id: string) { return this.service.findOne(u, id) }

  @Patch(':id')
  update(@CurrentUser() u: any, @Param('id') id: string, @Body() dto: any) { return this.service.update(u, id, dto) }

  @Delete(':id')
  remove(@CurrentUser() u: any, @Param('id') id: string) { return this.service.remove(u, id) }
}
