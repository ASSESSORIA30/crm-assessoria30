import { Module } from '@nestjs/common'
import { OportunitatsController } from './oportunitats.controller'
import { OportunitatsService } from './oportunitats.service'

@Module({
  controllers: [OportunitatsController],
  providers: [OportunitatsService],
  exports: [OportunitatsService],
})
export class OportunitatsModule {}
