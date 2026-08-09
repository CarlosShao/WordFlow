import { describe, it, expect, beforeEach, vi } from 'vitest'
import Fastify, { type FastifyInstance } from 'fastify'
import jwt from 'jsonwebtoken'

vi.mock('bcryptjs', () => ({
  default: {
    hash: () => Promise.resolve('mock-hashed-password'),
    compare(password: any) {
      return Promise.resolve(password === 'password123')
    },
  },
}))

const mockPrisma = {
  user: {
    findUnique: vi.fn(async () => null),
    findFirst: vi.fn(async () => null),
    create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({
      id: crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
      ...data,
    })),
    update: vi.fn(async ({ where }: { where: { id: string } }) => ({
      id: where.id,
      email: 'updated@test.com',
      username: null,
      avatarUrl: null,
      githubId: null,
    })),
  },
  refreshToken: {
    create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({
      id: crypto.randomUUID(),
      createdAt: new Date(),
      ...data,
    })),
    findUnique: vi.fn(async () => null),
    update: vi.fn(async () => ({})),
    delete: vi.fn(async () => ({})),
    deleteMany: vi.fn(async () => ({ count: 1 })),
  },
}

const mockRedis = {
  get: vi.fn(async () => null),
  set: vi.fn(async () => 'OK'),
  del: vi.fn(async () => 1),
}

vi.mock('../common/prisma.js', () => ({
  getPrisma: () => mockPrisma,
  disconnectPrisma: vi.fn(),
}))

vi.mock('../common/redis.js', () => ({
  getRedis: () => mockRedis,
  disconnectRedis: vi.fn(),
}))

const mockFetch = vi.fn()
global.fetch = mockFetch

import { authRoutes, buildAuthenticate } from '../modules/auth/index.js'
import { errorHandler } from '../common/errors.js'
import { config } from '../config/index.js'

describe('Auth Routes', () => {
  let app: FastifyInstance

  beforeEach(async () => {
    app = Fastify()
    vi.clearAllMocks()
    mockPrisma.user.findUnique = vi.fn(async () => null)
    mockPrisma.user.findFirst = vi.fn(async () => null)
    mockPrisma.user.create = vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({
      id: crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
      ...data,
    }))
    mockPrisma.user.update = vi.fn(async ({ where }: { where: { id: string } }) => ({
      id: where.id,
      email: 'updated@test.com',
      username: null,
      avatarUrl: null,
      githubId: null,
    }))
    mockPrisma.refreshToken.create = vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({
      id: crypto.randomUUID(),
      createdAt: new Date(),
      ...data,
    }))
    mockPrisma.refreshToken.findUnique = vi.fn(async () => null)
    mockPrisma.refreshToken.update = vi.fn(async () => ({}))
    mockPrisma.refreshToken.delete = vi.fn(async () => ({}))
    mockPrisma.refreshToken.deleteMany = vi.fn(async () => ({ count: 1 }))
    mockRedis.get = vi.fn(async () => null)
    mockRedis.set = vi.fn(async () => 'OK')
    mockRedis.del = vi.fn(async () => 1)
    mockFetch.mockReset()
    app.setErrorHandler(errorHandler)
    await app.register(authRoutes)
    await app.ready()
  })

  describe('POST /api/v1/auth/register', () => {
    it('201 success', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: {
          email: 'newuser@test.com',
          password: 'password123',
          username: 'newuser',
        },
      })
      expect(response.statusCode).toBe(201)
      const body = response.json()
      expect(body.success).toBe(true)
      expect(body.data.user.email).toBe('newuser@test.com')
      expect(body.data.user.username).toBe('newuser')
      expect(body.data.accessToken).toBeDefined()
      expect(body.data.refreshToken).toBeDefined()
    })

    it('400 invalid email', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: { email: 'not-an-email', password: 'password123' },
      })
      expect(response.statusCode).toBe(400)
      expect(response.json().success).toBe(false)
    })

    it('400 password too short', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: { email: 'test@test.com', password: '123' },
      })
      expect(response.statusCode).toBe(400)
      expect(response.json().success).toBe(false)
    })

    it('409 email already registered', async () => {
      const mockUser = { id: 'existing-id', email: 'taken@test.com' }
      mockUser['password'] = 'x'
      mockPrisma.user.findUnique = vi.fn(async () => mockUser)
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/register',
        payload: { email: 'taken@test.com', password: 'password123' },
      })
      expect(response.statusCode).toBe(409)
      expect(response.json().error.type).toBe('CONFLICT')
    })
  })

  describe('POST /api/v1/auth/login', () => {
    it('200 success', async () => {
      const loginUser = { id: 'user-123', email: 'login@test.com', username: 'testuser', avatarUrl: null, githubId: null }
      loginUser['password'] = 'x'
      mockPrisma.user.findUnique = vi.fn(async () => loginUser)
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email: 'login@test.com', password: 'password123' },
      })
      expect(response.statusCode).toBe(200)
      const body = response.json()
      expect(body.success).toBe(true)
      expect(body.data.user.email).toBe('login@test.com')
      expect(body.data.accessToken).toBeDefined()
      expect(body.data.refreshToken).toBeDefined()
    })

    it('401 wrong password', async () => {
      const loginUser = { id: 'user-123', email: 'login@test.com', username: 'testuser', avatarUrl: null, githubId: null }
      loginUser['password'] = 'x'
      mockPrisma.user.findUnique = vi.fn(async () => loginUser)
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email: 'login@test.com', password: 'wrongpassword' },
      })
      expect(response.statusCode).toBe(401)
      expect(response.json().error.type).toBe('AUTH_ERROR')
    })

    it('401 user not found', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/login',
        payload: { email: 'nonexistent@test.com', password: 'password123' },
      })
      expect(response.statusCode).toBe(401)
      expect(response.json().error.type).toBe('AUTH_ERROR')
    })
  })

  describe('POST /api/v1/auth/refresh', () => {
    it('200 success', async () => {
      const refreshToken = 'valid-refresh-token'
      mockRedis.get = vi.fn(async () => 'user-123')
      mockPrisma.refreshToken.findUnique = vi.fn(async () => ({
        id: 'rt-1',
        token: refreshToken,
        userId: 'user-123',
        expiresAt: new Date(Date.now() + 86400000),
        createdAt: new Date(),
        user: {
          id: 'user-123',
          email: 'refresh@test.com',
          username: null,
          avatarUrl: null,
          githubId: null,
        },
      }))
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/refresh',
        payload: { refreshToken },
      })
      expect(response.statusCode).toBe(200)
      const body = response.json()
      expect(body.success).toBe(true)
      expect(body.data.accessToken).toBeDefined()
      expect(body.data.refreshToken).toBeDefined()
    })

    it('401 token not in whitelist', async () => {
      mockRedis.get = vi.fn(async () => null)
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/refresh',
        payload: { refreshToken: 'invalid-token' },
      })
      expect(response.statusCode).toBe(401)
      expect(response.json().error.type).toBe('AUTH_ERROR')
    })
  })

  describe('POST /api/v1/auth/logout', () => {
    it('200 success', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/auth/logout',
        payload: { refreshToken: 'some-token' },
      })
      expect(response.statusCode).toBe(200)
      expect(response.json().success).toBe(true)
    })
  })

  describe('GET /api/v1/auth/github', () => {
    it('302 redirect to GitHub', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/github',
      })
      expect(response.statusCode).toBe(302)
      expect(response.headers.location).toContain('github.com/login/oauth/authorize')
      expect(response.headers.location).toContain('client_id=')
    })
  })

  describe('GET /api/v1/auth/github/callback', () => {
    it('200 GitHub login success', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'github-access-token' }),
      })
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 12345,
          login: 'ghuser',
          name: 'GitHub User',
          email: 'ghuser@github.com',
          avatar_url: 'https://avatars.githubusercontent.com/u/12345',
        }),
      })
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/github/callback?code=test-auth-code',
      })
      expect(response.statusCode).toBe(200)
      const body = response.json()
      expect(body.success).toBe(true)
      expect(body.data.user.email).toBe('ghuser@github.com')
      expect(body.data.user.githubId).toBe('12345')
      expect(body.data.accessToken).toBeDefined()
      expect(body.data.refreshToken).toBeDefined()
    })

    it('401 auth denied', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/auth/github/callback?error=access_denied',
      })
      expect(response.statusCode).toBe(401)
      expect(response.json().error.type).toBe('AUTH_ERROR')
    })
  })

  describe('authenticate middleware', () => {
    let testApp: FastifyInstance

    beforeEach(async () => {
      testApp = Fastify()
      testApp.setErrorHandler(errorHandler)
      testApp.decorate('authenticate', buildAuthenticate())
      await testApp.register(authRoutes)
    })

    it('401 missing auth header', async () => {
      testApp.get('/api/v1/test-protected', { preHandler: [testApp.authenticate] }, async (request) => {
        return { success: true, userId: request.user!.id }
      })
      await testApp.ready()
      const response = await testApp.inject({ method: 'GET', url: '/api/v1/test-protected' })
      expect(response.statusCode).toBe(401)
    })

    it('401 invalid token', async () => {
      testApp.get('/api/v1/test-protected', { preHandler: [testApp.authenticate] }, async (request) => {
        return { success: true, userId: request.user!.id }
      })
      await testApp.ready()
      const response = await testApp.inject({
        method: 'GET',
        url: '/api/v1/test-protected',
        headers: { Authorization: 'Bearer <REDACTED>' },
      })
      expect(response.statusCode).toBe(401)
    })

    it('200 valid token injects request.user', async () => {
      const validToken = jwt.sign({ id: 'user-456', email: 'valid@test.com' }, config.jwt.secret, { expiresIn: '15m' })
      testApp.get('/api/v1/test-protected', { preHandler: [testApp.authenticate] }, async (request) => {
        return { success: true, userId: request.user!.id, email: request.user!.email }
      })
      await testApp.ready()
      const response = await testApp.inject({
        method: 'GET',
        url: '/api/v1/test-protected',
        headers: { Authorization: 'Bearer ' + validToken },
      })
      expect(response.statusCode).toBe(200)
      const body = response.json()
      expect(body.userId).toBe('user-456')
      expect(body.email).toBe('valid@test.com')
    })
  })
})
