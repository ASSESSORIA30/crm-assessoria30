import { Controller, Get } from '@nestjs/common'

@Controller()
export class HealthController {
  @Get('health')
  health() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    }
  }

  @Get('/')
  root() {
    return {
      name: 'CRM Assessoria 3.0 API',
      status: 'running',
      health: '/health',
      api: '/api/v1',
    }
  }
}
