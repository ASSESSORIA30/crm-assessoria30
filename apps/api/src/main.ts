// apps/api/src/main.ts
import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { logger: ['error', 'warn', 'log'] })

  app.setGlobalPrefix('api/v1', { exclude: ['health'] })

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  )

  app.enableCors({
    origin: true,
    credentials: true,
  })

  const port = process.env.PORT || 3000
  await app.listen(port, '0.0.0.0')
  console.log(`API → http://0.0.0.0:${port}/api/v1`)
}

bootstrap()
