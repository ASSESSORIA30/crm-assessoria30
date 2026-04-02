import { Controller, Get, Post, Param, Body, Query, Res, UseGuards } from '@nestjs/common'
import { Response } from 'express'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { PrismaService } from '../../prisma/prisma.service'
import { ComparisonsService } from './comparisons.service'

@Controller('comparisons')
@UseGuards(JwtAuthGuard)
export class ComparisonsController {
  constructor(
    private prisma: PrismaService,
    private service: ComparisonsService,
  ) {}

  @Get('lookup/:cups')
  async lookupCups(@Param('cups') cups: string) {
    return this.service.lookupCups(cups)
  }

  @Post('generate')
  async generate(@Body() body: any, @CurrentUser() user: any): Promise<any> {
    return this.service.generate({ ...body, agentId: user.id })
  }

  @Get()
  async list() {
    return this.prisma.comparison.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
  }

  @Get(':id')
  async get(@Param('id') id: string) {
    return this.prisma.comparison.findUnique({ where: { id } })
  }

  @Get(':id/pdf')
  async pdf(@Param('id') id: string, @Res() res: Response) {
    const buffer = await this.service.generatePdf(id)
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=comparativa-${id.slice(0, 8)}.pdf`,
      'Content-Length': buffer.length,
    })
    res.end(buffer)
  }
}
