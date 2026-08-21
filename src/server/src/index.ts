import Fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import multipart from '@fastify/multipart'
import compress from '@fastify/compress'
import { setGlobalDispatcher, Agent } from 'undici'
import { config } from './config/index.js'
import { errorHandler } from './common/errors.js'
import { logger } from './common/logger.js'

// Force all outbound `fetch` calls (Bilibili API + media CDN proxy) to use
// IPv4. Inside Docker the container has no IPv6 egress, but Bilibili's CDN
// domains resolve to AAAA records first; Node's fetch then fails with
// ENETUNREACH and every video/proxy request 500s. Pinning the undici
// dispatcher to `family: 4` makes connections succeed over IPv4.
setGlobalDispatcher(new Agent({ connect: { family: 4 } }))

// Routes
import { authRoutes, buildAuthenticate } from './modules/auth/index.js'
import { contentRoutes } from './modules/content/index.js'
import { crawlerModule } from './modules/crawler/index.js'
import { vocabularyRoutes } from './modules/vocabulary/index.js'
import { practiceRoutes } from './modules/practice/index.js'
import { mistakeRoutes } from './modules/mistakes/index.js'
import { dashboardRoutes } from './modules/dashboard/index.js'
import { aiRoutes } from './modules/ai/index.js'
import { aiProcessingModule } from './modules/ai-processing/index.js'
import { uploadRoutes } from './modules/upload/index.js'
import { dictionaryModule } from './modules/dictionary/index.js'
import { mediaRoutes } from './modules/media/index.js'
import { examRoutes } from './modules/exam/index.js'

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: process.env.LOG_LEVEL ?? 'info',
      transport: config.nodeEnv === 'development' ? { target: 'pino-pretty' } : undefined,
    },
  })

  // Middleware
  await app.register(cors, { origin: config.corsOrigin, credentials: true })
  await app.register(helmet, { contentSecurityPolicy: false })
  // gzip/deflate response compression. The content detail + segments
  // endpoints return ~1MB of JSON for season-long videos (e.g. Key & Peele);
  // compressing cuts transfer to ~150-250KB. The dev docker-compose setup has
  // no nginx in front, so the app itself must compress.
  await app.register(compress, { global: true })

  // Swagger docs
  await app.register(swagger, {
    openapi: {
      info: { title: 'WordFlow API', version: '1.0.0', description: 'WordFlow英语学习应用API' },
      servers: [{ url: 'http://localhost:3002' }],
      components: {
        securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' } },
      },
    },
  })
  await app.register(swaggerUi, { routePrefix: '/docs' })

  // Multipart support for file uploads
  await app.register(multipart, {
    limits: {
      fileSize: 100 * 1024 * 1024, // 100MB max (matches media type limit)
      files: 1, // Single file per request
    },
  })

  // Error handler
  app.setErrorHandler(errorHandler)

  // Health check
  app.get('/health', async (_req, reply) => {
    return reply.send({ success: true, data: { status: 'ok', timestamp: new Date().toISOString() } })
  })

  // Auth decorator (authenticate middleware)
  app.decorate('authenticate', buildAuthenticate())

  // Routes
  await app.register(authRoutes)
  await app.register(contentRoutes)
  await app.register(crawlerModule)
  await app.register(vocabularyRoutes)
  await app.register(practiceRoutes)
  await app.register(mistakeRoutes)
  await app.register(dashboardRoutes)
  await app.register(aiRoutes)
  await app.register(aiProcessingModule)
  await app.register(uploadRoutes)
  await app.register(dictionaryModule)
  await app.register(mediaRoutes)
  await app.register(examRoutes)

  return app
}

async function start() {
  try {
    const app = await buildApp()
    await app.listen({ port: config.port, host: '0.0.0.0' })
    logger.info(`WordFlow server running on http://localhost:${config.port}`)
  } catch (err) {
    logger.error({ err }, 'Failed to start server')
    process.exit(1)
  }
}

// 作为独立入口执行时启动服务。
// 同时兼容 `node/tsx src/index.ts`、`tsx watch src/index.ts` 等多种调用方式：
// tsx 包装后 process.argv[1] 可能为绝对路径或带扩展名，用 basename 匹配更稳健。
const invokedFile = process.argv[1] ?? ''
if (invokedFile.endsWith('src/index.ts') || invokedFile.endsWith('src\\index.ts') || import.meta.url.endsWith('/src/index.ts')) {
  start()
}
