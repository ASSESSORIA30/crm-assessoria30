// apps/api/src/modules/auth/auth.controller.ts
import { Controller, Post, Get, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common'
import { AuthService }    from './auth.service'
import { JwtAuthGuard }   from '../../common/guards/jwt-auth.guard'
import { CurrentUser }    from '../../common/decorators/current-user.decorator'
import { IsEmail, IsString, MinLength } from 'class-validator'

class LoginDto {
  @IsEmail()    email:    string
  @IsString()   password: string
}
class RefreshDto { @IsString() refreshToken: string }

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.email, dto.password)
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken)
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@Body() dto: RefreshDto) {
    return this.auth.logout(dto.refreshToken)
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@CurrentUser() user: any) {
    return this.auth.getMe(user.id)
  }
}
