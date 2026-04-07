// apps/api/src/prisma/prisma.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name)

  async onModuleInit() {
    // Don't block bootstrap if DB isn't reachable — health endpoint must still respond
    try {
      await this.$connect()
      this.logger.log('Connected to database')
    } catch (err: any) {
      this.logger.error(`Failed to connect to database: ${err.message}`)
    }
  }

  async onModuleDestroy() {
    try { await this.$disconnect() } catch { /* ignore */ }
  }
}
