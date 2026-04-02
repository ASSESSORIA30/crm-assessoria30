import { Controller, Post, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { TariffSyncService } from './tariff-sync.service'

@Controller('tariff-sync')
@UseGuards(JwtAuthGuard)
export class TariffSyncController {
  constructor(private service: TariffSyncService) {}

  @Post('sync-email')
  async syncEmail() {
    return this.service.syncFromEmail()
  }
}
