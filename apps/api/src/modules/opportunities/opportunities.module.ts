// apps/api/src/modules/opportunities/opportunities.module.ts
import { Module }                  from '@nestjs/common'
import { OpportunitiesController } from './opportunities.controller'
import { OpportunitiesService }    from './opportunities.service'

@Module({ controllers: [OpportunitiesController], providers: [OpportunitiesService] })
export class OpportunitiesModule {}
