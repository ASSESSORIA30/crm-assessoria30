// apps/api/src/main.ts
import 'reflect-metadata'
import * as http from 'http'
import { NestFactory } from '@nestjs/core'
import { ValidationPipe, Logger } from '@nestjs/common'
import { ExpressAdapter } from '@nestjs/platform-express'
// eslint-disable-next-line @typescript-eslint/no-var-requires
const express = require('express')
import { AppModule } from './app.module'

async function bootstrap() {
  const logger = new Logger('Bootstrap')
  const port = Number(process.env.PORT ?? process.env.API_PORT ?? 3001)

  // Create express instance and bind HTTP server IMMEDIATELY
  // This guarantees /health responds even before NestJS finishes loading
  const expressApp = express()
  let nestReady = false

  // Health endpoint — always works, no dependencies
  expressApp.get('/health', (_req: any, res: any) => {
    res.json({
      status: 'ok',
      nestReady,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    })
  })

  expressApp.get('/', (_req: any, res: any) => {
    res.json({
      name: 'CRM Assessoria 3.0 API',
      status: nestReady ? 'running' : 'starting',
      health: '/health',
      api: '/api/v1',
    })
  })

  // Start HTTP server immediately
  const server = http.createServer(expressApp)
  await new Promise<void>((resolve, reject) => {
    server.listen(port, '0.0.0.0', () => {
      logger.log(`HTTP server listening on 0.0.0.0:${port}`)
      resolve()
    })
    server.on('error', reject)
  })

  // Now try to bootstrap NestJS on top of the existing express app
  try {
    logger.log('Bootstrapping NestJS...')
    const app = await NestFactory.create(AppModule, new ExpressAdapter(expressApp), {
      logger: ['error', 'warn', 'log'],
      abortOnError: false,
    })

    app.setGlobalPrefix('api/v1', { exclude: ['health', '/'] })

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    )

    const corsOrigins = process.env.API_CORS_ORIGINS?.split(',').map(s => s.trim()).filter(Boolean)
    app.enableCors({
      origin: corsOrigins && corsOrigins.length > 0 ? corsOrigins : true,
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })

    await app.init()
    nestReady = true
    logger.log(`NestJS ready → /api/v1 routes registered`)
  } catch (err: any) {
    logger.error(`NestJS bootstrap failed: ${err?.message ?? err}`)
    if (err?.stack) logger.error(err.stack)
    // Keep HTTP server alive so /health responds and logs are visible
    logger.warn('HTTP server remains alive — only /health and / endpoints available')
  }
}

bootstrap().catch(err => {
  // eslint-disable-next-line no-console
  console.error('Fatal bootstrap error:', err)
})
