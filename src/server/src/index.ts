import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import { config } from './config/index.js'
import { errorHandler } from './common/errors.js'
import { logger } from './common/logger.js'

const app = Fastify({
  logger: logger[config.nodeEnv],
  bodyLimit: 10 * 1024 * 1024, // 10MB
})

// Plugins
await app.register(cors, {
  origin: config.corsOrigin,
  credentials: true,
})

await app.register(helmet, {
  contentSecurityPolicy: config.nodeEnv === 'production',
})

await app.register(swagger, {
  openapi: {
    info: {
      title: 'WordFlow API',
      description: 'WordFlow 英语学习应用 API',
      version: '1.0.0',
    },
    servers: [{ url: `http://localhost:${config.port}` }],
  },
})

await app.register(swaggerUi, {
  routePrefix: '/docs',
})

// Health check
app.get('/health', async () => ({
  status: 'ok',
  timestamp: new Date().toISOString(),
  uptime: process.uptime(),
}))

// Error handler
app.setErrorHandler(errorHandler)

// Start
try {
  await app.listen({ port: config.port, host: '0.0.0.0' })
  app.log.info(`Server running on http://localhost:${config.port}`)
} catch (err) {
  app.log.error(err)
  process.exit(1)
}

export default app
