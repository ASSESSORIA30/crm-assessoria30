import { Module } from '@nestjs/common'
import { TariffSyncController } from './tariff-sync.controller'
import { TariffSyncService } from './tariff-sync.service'
import { ProductsModule } from '../products/products.module'
import { OportunitatsModule } from '../oportunitats/oportunitats.module'

@Module({
  imports: [ProductsModule, OportunitatsModule],
  controllers: [TariffSyncController],
  providers: [TariffSyncService],
})
export class TariffSyncModule {}
