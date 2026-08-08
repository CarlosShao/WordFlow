import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import { config } from './config/index.js'
import { errorHandler } from './common/errors.js'
import { logger } from './common/logger.js'

// Routes
import { authRoutes, buildAuthenticate } from './modules/auth/index.js'
import { contentRoutes } from './modules/content/index.js'
import { vocabularyRoutes } from './modules/vocabulary/index.js'
import { practiceRoutes } from './modules/practice/index.js'
import { mistakeRoutes } from './modules/mistakes/index.js'
import { dashboardRoutes } from './modules/dashboard/index.js'
import { aiRoutes } from './modules/ai/index.js'

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: config.LOG_LEVEL,
      transport: config.NODE_ENV === 'development' ? { target: 'pino-pretty' } : undefined,
    },
  })

  // Middleware
  await app.register(cors, { origin: config.CORS_ORIGIN, credentials: true })
  await app.register(helmet, { contentSecurityPolicy: false })

  // Swagger docs
  await app.register(swagger, {
    openapi: {
      info: { title: 'WordFlow API', version: '1.0.0', description: 'WordFlow英语学习应用API' },
      servers: [{ url: 'http://localhost:3001' }],
      components: {
        securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
      },
    },
  })
  await app.register(swaggerUi, { routePrefix: '/docs' })

  // Error handler
  app.setErrorHandler(errorHandler)

  // Health check
  app.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }))

  // Auth decorator (authenticate middleware)
  app.decorate('authenticate', buildAuthenticate())

  // Routes
  await app.register(authRoutes)
  await app.register(contentRoutes)
  await app.register(vocabularyRoutes)
  await app.register(practiceRoutes)
  await app.register(mistakeRoutes)
  await app.register(dashboardRoutes)
  await app.register(aiRoutes)

  return app
}

async function start() {
  try {
    const app = await buildApp()
    await app.listen({ port: config.PORT, host: '0.0.0.0' })
    logger.info(`WordFlow server running on http://localhost:${config.PORT}`)
  } catch (err) {
    logger.error({ err }, 'Failed to start server')
    process.exit(1)
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  start()
}
