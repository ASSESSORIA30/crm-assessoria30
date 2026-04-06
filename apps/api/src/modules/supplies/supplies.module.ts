import { Module } from '@nestjs/common'
import { SuppliesController } from './supplies.controller'
import { SuppliesService } from './supplies.service'
import { CommissionChainService } from './commission-chain.service'

@Module({
  controllers: [SuppliesController],
  providers: [SuppliesService, CommissionChainService],
  exports: [CommissionChainService],
})
export class SuppliesModule {}
