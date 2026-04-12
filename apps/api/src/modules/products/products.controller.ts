import { Controller, Post, Get, Patch, Delete, Param, Body, Query, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common'
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
    const grouped = await this.prisma.tariff.groupBy({
      by: ['company'],
      _count: { company: true },
      orderBy: { company: 'asc' },
    })
    return grouped.map(g => ({ company: g.company, count: g._count.company }))
  }

  @Get('company-logos')
  async companyLogos() {
    return this.prisma.companyLogo.findMany()
  }

  @Post('companies/:company/logo')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 2 * 1024 * 1024 } }))
  async uploadLogo(@Param('company') company: string, @UploadedFile() file: any) {
    if (!file) throw new Error('No file received')
    const logoData = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`
    return this.prisma.companyLogo.upsert({
      where: { company },
      create: { company, logoData },
      update: { logoData },
    })
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 20 * 1024 * 1024 } }))
  async upload(@UploadedFile() file: any, @CurrentUser() user: any) {
    if (!file) throw new Error('No s\'ha rebut cap fitxer')
    const mimetype = file.mimetype ?? ''
    const filename = (file.originalname ?? '').toLowerCase()
    const isExcel = mimetype.includes('spreadsheet') || mimetype.includes('excel')
      || filename.endsWith('.xlsx') || filename.endsWith('.xls')
    if (!isExcel) throw new Error(`Només es permeten fitxers Excel. Rebut: ${mimetype}`)
    return this.productsService.importFromExcel(file.buffer, file.originalname, user.id)
  }

  @Get()
  async list(
    @Query('company') company?: string,
    @Query('serviceType') serviceType?: string,
  ) {
    const where: any = {}
    if (company) where.company = company
    if (serviceType) where.serviceType = serviceType
    return this.prisma.tariff.findMany({
      where,
      orderBy: [{ company: 'asc' }, { productName: 'asc' }],
    })
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    const data: any = {}
    const numFields = [
      'powerPriceP1','powerPriceP2','powerPriceP3','powerPriceP4','powerPriceP5','powerPriceP6',
      'energyPriceP1','energyPriceP2','energyPriceP3','energyPriceP4','energyPriceP5','energyPriceP6',
      'feePowerSingle','feePowerMin','feePowerMax','feeEnergySingle','feeEnergyMin','feeEnergyMax',
    ]
    for (const f of numFields) {
      if (body[f] !== undefined) data[f] = body[f] !== null && body[f] !== '' ? Number(body[f]) : null
    }
    for (const f of ['company','serviceType','tariffType','productName','excedentes','priceType']) {
      if (body[f] !== undefined) data[f] = body[f]
    }
    if (body.residential !== undefined) data.residential = body.residential
    if (body.pyme !== undefined) data.pyme = body.pyme
    return this.prisma.tariff.update({ where: { id }, data })
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.prisma.tariff.delete({ where: { id } })
  }
}
