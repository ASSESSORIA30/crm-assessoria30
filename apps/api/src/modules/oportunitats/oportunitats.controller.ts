import { Controller, Get, Patch, Param, Post, Body, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { PrismaService } from '../../prisma/prisma.service'
import { OportunitatsService } from './oportunitats.service'

@Controller('oportunitats')
@UseGuards(JwtAuthGuard)
export class OportunitatsController {
  constructor(
    private prisma: PrismaService,
    private service: OportunitatsService,
  ) {}

  @Get()
  async list() {
    return this.prisma.oportunitat.findMany({
      include: {
        client: { select: { name: true, email: true, phone: true } },
        tarifaNova: {
          include: { company: { select: { nombre: true } } },
        },
      },
      orderBy: { estalviAnual: 'desc' },
    })
  }

  @Patch(':id/estat')
  async updateEstat(@Param('id') id: string, @Body() body: { estat: string }) {
    return this.prisma.oportunitat.update({
      where: { id },
      data: { estat: body.estat },
    })
  }

  @Post('detect/:tarifaId')
  async detect(@Param('tarifaId') tarifaId: string) {
    const created = await this.service.detectOpportunities(tarifaId)
    return { created: created.length, oportunitats: created }
  }

  @Post('detect-all')
  async detectAll() {
    const tarifes = await this.prisma.tarifa.findMany({
      where: { activa: true, preuKwh: { not: null } },
    })
    let total = 0
    for (const t of tarifes) {
      const created = await this.service.detectOpportunities(t.id)
      total += created.length
    }
    return { total, message: `${total} noves oportunitats detectades` }
  }
}
