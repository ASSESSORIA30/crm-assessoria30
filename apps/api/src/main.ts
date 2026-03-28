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

  app.enableCors({
    origin: process.env.API_CORS_ORIGINS?.split(',') ?? ['http://localhost:3000'],
    credentials: true,
  })

  const port = process.env.API_PORT ?? 3001
  await app.listen(port)
  console.log(`\n🚀 API running → http://localhost:${port}/api/v1\n`)
}

bootstrap()
