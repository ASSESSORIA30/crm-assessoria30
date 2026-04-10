// apps/api/src/app.module.ts
import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { PrismaModule }  from './prisma/prisma.module'
import { AuthModule }    from './modules/auth/auth.module'
import { UsersModule }   from './modules/users/users.module'
import { ClientsModule } from './modules/clients/clients.module'
import { SuppliesModule }from './modules/supplies/supplies.module'
import { OpportunitiesModule } from './modules/opportunities/opportunities.module'
import { HealthModule } from './modules/health/health.module'
// import { ProductsModule } from './modules/products/products.module'
// import { OportunitatsModule } from './modules/oportunitats/oportunitats.module'
// import { RenewalsModule } from './modules/renewals/renewals.module'
// import { LiquidationsModule } from './modules/liquidations/liquidations.module'
// import { FacturasModule } from './modules/facturas/facturas.module'
// import { MarketModule } from './modules/market/market.module'
// import { DashboardModule } from './modules/dashboard/dashboard.module'
// import { ComparisonsModule } from './modules/comparisons/comparisons.module'
// import { StatsModule } from './modules/stats/stats.module'
// import { ProtocolsModule } from './modules/protocols/protocols.module'
// import { TariffSyncModule } from './modules/tariff-sync/tariff-sync.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    ClientsModule,
    SuppliesModule,
    OpportunitiesModule,
    HealthModule,
    // ProductsModule,
    // OportunitatsModule,
    // RenewalsModule,
    // LiquidationsModule,
    // FacturasModule,
    // MarketModule,
    // DashboardModule,
    // ComparisonsModule,
    // StatsModule,
    // ProtocolsModule,
    // TariffSyncModule,
  ],
})
export class AppModule {}
