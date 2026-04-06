// apps/api/src/main.ts
import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { AppModule } from './app.module'

async function bootstrap() {
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
  await app.listen(port, '0.0.0.0')
  console.log(`\n🚀 API running → port ${port} (prefix: /api/v1)\n`)
}

bootstrap()
