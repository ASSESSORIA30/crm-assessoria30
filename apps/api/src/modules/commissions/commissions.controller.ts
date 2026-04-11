import { Controller, Post, Get, Query, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { JwtAuthGuard }      from '../../common/guards/jwt-auth.guard'
import { CurrentUser }       from '../../common/decorators/current-user.decorator'
import { CommissionsService } from './commissions.service'

@Controller('commissions')
@UseGuards(JwtAuthGuard)
export class CommissionsController {
  constructor(private svc: CommissionsService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  async upload(@UploadedFile() file: any, @CurrentUser() user: any) {
    if (!file) throw new Error('Camp "file" obligatori (multipart/form-data)')
    const fn = (file.originalname ?? '').toLowerCase()
    if (!fn.endsWith('.xlsx') && !fn.endsWith('.xls'))
      throw new Error('Només fitxers Excel (.xlsx, .xls)')
    return this.svc.uploadRules(file.buffer, file.originalname, user?.id)
  }

  @Get('rules')
  async rules(@Query('type') type?: string) {
    return this.svc.getRules(type)
  }
}
