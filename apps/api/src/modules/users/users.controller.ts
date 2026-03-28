// apps/api/src/modules/users/users.controller.ts
import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common'
import { UsersService }  from './users.service'
import { JwtAuthGuard }  from '../../common/guards/jwt-auth.guard'
import { CurrentUser }   from '../../common/decorators/current-user.decorator'

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private s: UsersService) {}
  @Get('my-team')  myTeam (@CurrentUser() u: any) { return this.s.myTeam(u) }
  @Get('my-stats') myStats(@CurrentUser() u: any) { return this.s.myStats(u) }
  @Post()          create (@CurrentUser() u: any, @Body() dto: any) { return this.s.create(u, dto) }
}
