// apps/api/src/app.module.ts
import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { PrismaModule }  from './prisma/prisma.module'
import { AuthModule }    from './modules/auth/auth.module'
import { UsersModule }   from './modules/users/users.module'
import { ClientsModule } from './modules/clients/clients.module'
import { SuppliesModule }from './modules/supplies/supplies.module'
import { OpportunitiesModule } from './modules/opportunities/opportunities.module'
import { RgpdModule }         from './modules/rgpd/rgpd.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    ClientsModule,
    SuppliesModule,
    OpportunitiesModule,
    RgpdModule,
  ],
})
export class AppModule {}
