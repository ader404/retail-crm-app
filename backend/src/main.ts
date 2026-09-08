import { NestFactory } from '@nestjs/core'
import { ValidationPipe, Logger } from '@nestjs/common'
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'
import { NestExpressApplication } from '@nestjs/platform-express'
import { AppModule } from './app.module'
import { getUploadsDir } from './common/uploads-path'
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter'
import helmet from 'helmet'


async function bootstrap() {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required')
  }

  const app = await NestFactory.create<NestExpressApplication>(AppModule)
  const logger = new Logger('Bootstrap')

  app.useGlobalFilters(new AllExceptionsFilter())


  // Security headers. This backend only ever serves the local desktop app over
  // plain HTTP on 127.0.0.1, so HSTS (which instructs browsers to require HTTPS
  // for this host) is meaningless here and CSP is left on since the local
  // frontend still benefits from it.
  app.use(
    helmet({
      contentSecurityPolicy: process.env.NODE_ENV === 'production',
      hsts: false,
    }),
  )

  const frontendOrigin = process.env.FRONTEND_ORIGIN || 'http://127.0.0.1:3000'
  const allowedOrigins = new Set([
    frontendOrigin,
    frontendOrigin.replace('127.0.0.1', 'localhost'),
  ])

  app.enableCors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true)
        return
      }
      callback(new Error(`CORS rejected origin: ${origin}`), false)
    },
    credentials: true,
  })

  app.useStaticAssets(getUploadsDir(), { prefix: '/uploads' })

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
    }),
  )

  app.setGlobalPrefix('api')

  app.enableShutdownHooks()

  if (process.env.ENABLE_SWAGGER !== 'false') {
    const config = new DocumentBuilder()
      .setTitle('Retail CRM API')
      .setDescription('Single-shop CRM + POS + Inventory API')
      .setVersion('1.0')
      .addBearerAuth()
      .build()

    const document = SwaggerModule.createDocument(app, config)
    SwaggerModule.setup('api/docs', app, document)
  }

  const port = process.env.PORT || 3001
  // Bind explicitly to localhost only. This is a desktop app's local backend —
  // it must never be reachable from the LAN, only from the Electron-hosted
  // frontend running on the same machine.
  const host = process.env.HOST || '127.0.0.1'
  await app.listen(port, host)
  logger.log(`Application running on ${host}:${port}`)
}

bootstrap()
