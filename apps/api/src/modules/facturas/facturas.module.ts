import { Module } from '@nestjs/common'
import { FacturasController } from './facturas.controller'
import { FacturasService } from './facturas.service'
import { VerifactuService } from './verifactu.service'

@Module({
  controllers: [FacturasController],
  providers: [FacturasService, VerifactuService],
})
export class FacturasModule {}
