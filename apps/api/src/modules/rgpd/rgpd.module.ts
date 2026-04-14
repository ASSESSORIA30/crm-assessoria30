import { Module } from '@nestjs/common'
import { RgpdController } from './rgpd.controller'
import { RgpdService } from './rgpd.service'

@Module({
  controllers: [RgpdController],
  providers: [RgpdService],
})
export class RgpdModule {}
