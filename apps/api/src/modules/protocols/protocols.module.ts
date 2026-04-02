import { Module } from '@nestjs/common'
import { ProtocolsController } from './protocols.controller'
import { ProtocolParserService } from './protocol-parser.service'

@Module({
  controllers: [ProtocolsController],
  providers: [ProtocolParserService],
})
export class ProtocolsModule {}
