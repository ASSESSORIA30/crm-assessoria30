import { Controller, Post, Get, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { PrismaService } from '../../prisma/prisma.service'
import { ProtocolParserService } from './protocol-parser.service'

@Controller('protocols')
@UseGuards(JwtAuthGuard)
export class ProtocolsController {
  constructor(
    private prisma: PrismaService,
    private parser: ProtocolParserService,
  ) {}

  @Get()
  async list() {
    return this.prisma.protocol.findMany({
      orderBy: { createdAt: 'desc' },
    })
  }

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async upload(@UploadedFile() file: any, @CurrentUser() user: any) {
    const extracted = await this.parser.parseBuffer(file.buffer)

    const saved = await this.prisma.protocol.create({
      data: {
        proveedor: extracted.proveedor ?? null,
        vigenciaInicio: extracted.vigencia?.inicio ? new Date(extracted.vigencia.inicio) : null,
        vigenciaFin: extracted.vigencia?.fin ? new Date(extracted.vigencia.fin) : null,
        data: extracted,
        fileName: file.originalname,
        createdBy: user.id,
      },
    })

    return { protocol: saved, extracted }
  }
}
