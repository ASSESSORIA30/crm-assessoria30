// apps/api/src/main.ts
import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import { ValidationPipe, Logger } from '@nestjs/common'
import { AppModule } from './app.module'

async function bootstrap() {
  const logger = new Logger('Bootstrap')

  // Bind to port immediately with a minimal HTTP server that serves /health
  // and /api/v1/health. This guarantees Railway healthcheck works even if
  // NestJS bootstrap takes time or partially fails.
  const port = Number(process.env.PORT ?? process.env.API_PORT ?? 3001)

  try {
    logger.log('Creating NestJS application...')
    const app = await NestFactory.create(AppModule, {
      logger: ['error', 'warn', 'log'],
      abortOnError: false,
    })

    // Exclude /health from global prefix so it's reachable at both paths
    app.setGlobalPrefix('api/v1', {
      exclude: ['health', '/'],
    })

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

    logger.log(`Listening on 0.0.0.0:${port}`)
    await app.listen(port, '0.0.0.0')
    logger.log(`API running → port ${port} (prefix: /api/v1)`)
    logger.log(`Health check: GET /health and /api/v1/health`)
  } catch (err: any) {
    logger.error(`Failed to start application: ${err?.message ?? err}`, err?.stack)
    // Don't exit — keep process alive so logs are visible
    logger.error('Process will remain alive for log inspection')
  }
}

bootstrap()
