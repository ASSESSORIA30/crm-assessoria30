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
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 20 * 1024 * 1024 } }))
  async upload(@UploadedFile() file: any, @CurrentUser() user: any) {
    if (!file) throw new Error('No file uploaded')

    const mimetype = file.mimetype ?? ''
    const isExcel = mimetype.includes('spreadsheet')
      || mimetype.includes('excel')
      || file.originalname?.toLowerCase().endsWith('.xlsx')
      || file.originalname?.toLowerCase().endsWith('.xls')

    if (!isExcel) {
      throw new Error('Només es permeten fitxers Excel (.xlsx, .xls)')
    }

    return this.productsService.importFromExcel(file.buffer, file.originalname, user.id)
  }
}
