import { Controller, Post, Get, Patch, Param, Body, Query, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { PrismaService } from '../../prisma/prisma.service'
import { ProductsService } from './products.service'

@Controller('products')
@UseGuards(JwtAuthGuard)
export class ProductsController {
  constructor(
    private prisma: PrismaService,
    private productsService: ProductsService,
  ) {}

  @Get('companies')
  async companies() {
    return this.prisma.company.findMany({
      orderBy: { nombre: 'asc' },
      include: { _count: { select: { tarifes: true } } },
    })
  }

  @Get()
  async list(@Query('companyId') companyId?: string, @Query('tipus') tipus?: string) {
    const where: any = {}
    if (companyId) where.companyId = companyId
    if (tipus) where.tipus = tipus
    return this.prisma.tarifa.findMany({
      where,
      include: { company: { select: { nombre: true } } },
      orderBy: { createdAt: 'desc' },
    })
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    const data: any = {}
    if (body.preuKwh !== undefined) data.preuKwh = body.preuKwh
    if (body.preuKw !== undefined) data.preuKw = body.preuKw
    if (body.peatge !== undefined) data.peatge = body.peatge
    if (body.condicions !== undefined) data.condicions = body.condicions
    if (body.activa !== undefined) data.activa = body.activa
    return this.prisma.tarifa.update({ where: { id }, data })
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async upload(@UploadedFile() file: any, @CurrentUser() user: any) {
    const content = this.productsService.buildContent(file)
    const extracted = await this.productsService.analyzeWithAI(content)

    const saved = await Promise.all(extracted.map(async (t: any) => {
      const companyName = (t.companyia ?? t.company ?? 'Desconeguda').trim()
      const company = await this.prisma.company.upsert({
        where: { nombre: companyName },
        update: {},
        create: { nombre: companyName },
      })
      return this.prisma.tarifa.create({
        data: {
          companyId: company.id,
          nombre: t.nom_tarifa ?? t.nombre ?? null,
          tipus: t.tipus ?? null,
          preuKwh: t.preu_kwh != null ? Number(t.preu_kwh) : null,
          preuKw: t.preu_kw != null ? Number(t.preu_kw) : null,
          peatge: t.peatge != null ? Number(t.peatge) : null,
          condicions: t.condicions ?? null,
        },
        include: { company: { select: { nombre: true } } },
      })
    }))

    return { tarifes: saved, extracted }
  }
}
