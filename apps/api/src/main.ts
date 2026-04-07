// apps/api/src/main.ts
import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import { ValidationPipe, Logger } from '@nestjs/common'
import { AppModule } from './app.module'

async function bootstrap() {
  const logger = new Logger('Bootstrap')

  try {
    logger.log('Creating NestJS application...')
    const app = await NestFactory.create(AppModule, { logger: ['error', 'warn', 'log'] })

    app.setGlobalPrefix('api/v1')

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    )

    // CORS — allow Vercel frontend + local dev
    const corsOrigins = process.env.API_CORS_ORIGINS?.split(',').map(s => s.trim()).filter(Boolean)
    app.enableCors({
      origin: corsOrigins && corsOrigins.length > 0 ? corsOrigins : true,
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })

    // Railway provides PORT env var (not API_PORT)
    const port = Number(process.env.PORT ?? process.env.API_PORT ?? 3001)
    logger.log(`Listening on 0.0.0.0:${port}`)
    await app.listen(port, '0.0.0.0')
    logger.log(`API running → port ${port} (prefix: /api/v1)`)
    logger.log(`Health check: GET /api/v1/health`)
  } catch (err: any) {
    logger.error(`Failed to start application: ${err.message}`, err.stack)
    process.exit(1)
  }
}

bootstrap()
