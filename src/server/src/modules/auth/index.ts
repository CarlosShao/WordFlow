import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import jwt from 'jsonwebtoken'
import { AppError, ErrorType } from '../../common/errors.js'
import { config } from '../../config/index.js'
import { logger } from '../../common/logger.js'
import { getPrisma } from '../../common/prisma.js'
import './types.js'
import {
  registerUser,
  loginUser,
  refreshTokens,
  logoutUser,
  getGitHubAuthUrl,
  handleGitHubCallback,
} from './service.js'

// ------------------- Schemas -------------------

const registerSchema = z.object({
  email: z.string().email('邮箱格式不正确'),
  password: z.string().min(6, '密码至少需要6位'),
  username: z.string().min(1).max(50).optional(),
})

const loginSchema = z.object({
  email: z.string().email('邮箱格式不正确'),
  password: z.string().min(1, '请输入密码'),
})

const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'refreshToken 不能为空'),
})

const updateSettingsSchema = z.object({
  settings: z.record(z.unknown()).optional(),
})

// ------------------- Routes -------------------

export async function authRoutes(app: FastifyInstance) {
  const prisma = getPrisma()

  // Register authenticate decorator if not already present
  if (!app.hasDecorator('authenticate')) {
    app.decorate('authenticate', buildAuthenticate())
  }

  // ---- Register ----
  app.post('/api/v1/auth/register', async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = registerSchema.safeParse(request.body)
    if (!parsed.success) {
      throw new AppError(ErrorType.VALIDATION, parsed.error.issues[0]?.message ?? '请求参数错误', 400, parsed.error.issues)
    }
    const body = parsed.data
    const result = await registerUser(body.email, body['password'], body.username)

    logger.info({ userId: result.user.id, email: result.user.email }, 'User registered')
    return reply.code(201).send({ success: true, data: result })
  })

  // ---- Login ----
  app.post('/api/v1/auth/login', async (request: FastifyRequest, reply: FastifyReply) => {
    const parsed = loginSchema.safeParse(request.body)
    if (!parsed.success) {
      throw new AppError(ErrorType.VALIDATION, parsed.error.issues[0]?.message ?? '请求参数错误', 400, parsed.error.issues)
    }
    const body = parsed.data
    const result = await loginUser(body.email, body['password'])

    logger.info({ userId: result.user.id, email: result.user.email }, 'User logged in')
    return reply.send({ success: true, data: result })
  })

  // ---- Refresh ----
  app.post('/api/v1/auth/refresh', async (request: FastifyRequest, reply: FastifyReply) => {
    const { refreshToken } = refreshSchema.parse(request.body)
    const tokens = await refreshTokens(refreshToken)

    return reply.send({ success: true, data: tokens })
  })

  // ---- Logout ----
  app.post('/api/v1/auth/logout', async (request: FastifyRequest, reply: FastifyReply) => {
    const { refreshToken } = refreshSchema.parse(request.body)
    await logoutUser(refreshToken)

    return reply.send({ success: true, data: null })
  })

  // ---- Get user settings ----
  app.get('/api/v1/auth/settings', { preHandler: [app.authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user!.id
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { settings: true } })
    return reply.send({ success: true, data: user?.settings ?? {} })
  })

  // ---- Update user settings (merge) ----
  app.put('/api/v1/auth/settings', { preHandler: [app.authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user!.id
    const { settings } = updateSettingsSchema.parse(request.body)

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { settings: true } })
    const merged = { ...(user?.settings as Record<string, unknown> | undefined ?? {}), ...(settings ?? {}) }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { settings: merged },
      select: { settings: true },
    })

    return reply.send({ success: true, data: updated.settings ?? {} })
  })

  // ---- GitHub OAuth: redirect ----
  app.get('/api/v1/auth/github', async (_request: FastifyRequest, reply: FastifyReply) => {
    const url = await getGitHubAuthUrl()
    return reply.redirect(url)
  })

  // ---- GitHub OAuth: callback ----
  app.get('/api/v1/auth/github/callback', async (request: FastifyRequest, reply: FastifyReply) => {
    const query = request.query as { code?: string; error?: string }

    if (query.error || !query.code) {
      const redirect = `${config.corsOrigin}/auth/callback?error=${encodeURIComponent(query.error ?? 'GitHub 授权被取消')}`
      return reply.redirect(redirect)
    }

    const result = await handleGitHubCallback(query.code)

    logger.info({ userId: result.user.id }, 'User logged in via GitHub')

    // Redirect back to frontend with tokens in query params
    const frontendUrl = config.corsOrigin.replace(/\/$/, '')
    const redirect = `${frontendUrl}/auth/callback?token=${encodeURIComponent(result.accessToken)}&refreshToken=${encodeURIComponent(result.refreshToken)}`
    return reply.redirect(redirect)
  })
}

// ------------------- Authenticate Decorator -------------------

/**
 * JWT authentication middleware.
 * Parses Bearer <REDACTED> from Authorization header and injects request.user.
 */
export function buildAuthenticate() {
  return async function authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    const authHeader = request.headers.authorization

    if (!authHeader?.startsWith('Bearer ')) {
      throw new AppError(ErrorType.AUTH, '缺少认证令牌', 401)
    }

    const token = authHeader.slice(7).trim()

    try {
      const payload = jwt.verify(token, config.jwt.secret) as { id: string; email: string }
      request.user = { id: payload.id, email: payload.email }
    } catch {
      throw new AppError(ErrorType.AUTH, '令牌无效或已过期', 401)
    }
  }
}
