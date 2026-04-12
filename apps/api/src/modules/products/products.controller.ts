import { Controller, Post, Get, Param, Query, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common'
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

  // Static routes first

  /** Returns distinct company names from the tariffs table */
  @Get('companies')
  async companies() {
    const grouped = await this.prisma.tariff.groupBy({
      by: ['company'],
      _count: { company: true },
      orderBy: { company: 'asc' },
    })
    return grouped.map(g => ({ company: g.company, count: g._count.company }))
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 20 * 1024 * 1024 } }))
  async upload(@UploadedFile() file: any, @CurrentUser() user: any) {
    if (!file) {
      throw new Error('No s\'ha rebut cap fitxer. Camp esperat: "file" (multipart/form-data)')
    }

    const mimetype = file.mimetype ?? ''
    const filename = (file.originalname ?? '').toLowerCase()
    const isExcel = mimetype.includes('spreadsheet')
      || mimetype.includes('excel')
      || filename.endsWith('.xlsx')
      || filename.endsWith('.xls')

    if (!isExcel) {
      throw new Error(`Només es permeten fitxers Excel (.xlsx, .xls). Rebut: ${mimetype} - ${filename}`)
    }

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
}
