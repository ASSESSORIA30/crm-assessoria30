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

  const allowedOrigins = process.env.API_CORS_ORIGINS?.split(',') ?? ['http://localhost:3000']
  app.enableCors({
    origin: (origin, callback) => {
      // Allow no-origin requests (Postman, server-to-server, etc.) and whitelisted origins.
      // The RGPD form sends same-origin requests via Next.js rewrites, so no special rule needed.
      if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        callback(null, true)
      } else {
        callback(null, false)
      }
    },
    credentials: true,
  })

  const port = process.env.API_PORT ?? 3001
  await app.listen(port)
  console.log(`\n🚀 API running → http://localhost:${port}/api/v1\n`)
}

bootstrap()
