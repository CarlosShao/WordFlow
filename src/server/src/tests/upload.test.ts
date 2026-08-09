import { describe, it, expect, beforeEach, vi } from 'vitest'
import Fastify, { type FastifyInstance } from 'fastify'
import multipart from '@fastify/multipart'
import jwt from 'jsonwebtoken'

// ------------------- Mocks -------------------

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
  },
  refreshToken: {
    create: vi.fn(async () => ({})),
    findUnique: vi.fn(async () => null),
    update: vi.fn(async () => ({})),
    deleteMany: vi.fn(async () => ({ count: 1 })),
  },
}

const mockRedis = {
  get: vi.fn(async () => null),
  set: vi.fn(async () => 'OK'),
  del: vi.fn(async () => 1),
}

const mockMinio = {
  putObject: vi.fn(async () => ({ etag: 'mock-etag' })),
  removeObject: vi.fn(async () => {}),
  bucketExists: vi.fn(async () => true),
  makeBucket: vi.fn(async () => {}),
}

vi.mock('../common/prisma.js', () => ({
  getPrisma: () => mockPrisma,
  disconnectPrisma: vi.fn(),
}))

vi.mock('../common/redis.js', () => ({
  getRedis: () => mockRedis,
  disconnectRedis: vi.fn(),
}))

vi.mock('../common/minio.js', () => ({
  getMinio: () => mockMinio,
  ensureBucket: vi.fn(async () => {}),
  buildUserKey: (userId: string, filename: string) =>
    `${userId}/${Date.now()}-${filename}`,
  disconnectMinio: vi.fn(),
}))

import { uploadRoutes } from '../modules/upload/index.js'
import { errorHandler } from '../common/errors.js'
import { buildAuthenticate } from '../modules/auth/index.js'
import { config } from '../config/index.js'

// ------------------- Helpers -------------------

function generateTestToken(userId: string, email: string): string {
  return jwt.sign({ id: userId, email }, config.jwt.secret, { expiresIn: '15m' })
}

function buildMultipartPayload(
  fileBuffer: Buffer,
  filename: string,
  fields: Record<string, string> = {},
): { payload: Buffer; headers: Record<string, string> } {
  const boundary = '----testboundary1234567890'
  const parts: string[] = []

  // Add fields
  for (const [key, value] of Object.entries(fields)) {
    parts.push(
      `--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${value}\r\n`,
    )
  }

  // Add file
  parts.push(
    `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: image/jpeg\r\n\r\n`,
  )

  const headerParts = parts.join('')
  const footer = `\r\n--${boundary}--\r\n`

  const payload = Buffer.concat([
    Buffer.from(headerParts, 'utf-8'),
    fileBuffer,
    Buffer.from(footer, 'utf-8'),
  ])

  return {
    payload,
    headers: {
      'content-type': `multipart/form-data; boundary=${boundary}`,
    },
  }
}

// ------------------- Tests -------------------

describe('Upload Routes', () => {
  let app: FastifyInstance
  const testUserId = 'test-user-123'
  const testEmail = 'upload@test.com'

  beforeEach(async () => {
    app = Fastify()
    app.setErrorHandler(errorHandler)
    app.decorate('authenticate', buildAuthenticate())

    await app.register(multipart, {
      limits: {
        fileSize: 100 * 1024 * 1024,
        files: 1,
      },
    })

    await app.register(uploadRoutes)
    await app.ready()

    vi.clearAllMocks()
  })

  describe('POST /api/v1/upload', () => {
    it('201 upload avatar successfully', async () => {
      const token = generateTestToken(testUserId, testEmail)
      const fileBuffer = Buffer.from('fake-image-content')
      const { payload, headers } = buildMultipartPayload(fileBuffer, 'avatar.jpg', {
        type: 'avatar',
      })

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/upload',
        headers: {
          ...headers,
          authorization: `Bearer ${token}`,
        },
        payload,
      })

      expect(response.statusCode).toBe(201)
      const body = response.json()
      expect(body.success).toBe(true)
      expect(body.data).toBeDefined()
      expect(body.data.key).toContain('avatars/')
      expect(body.data.key).toContain(testUserId)
      expect(body.data.size).toBe(fileBuffer.length)
      expect(body.data.mimetype).toBe('image/jpeg')
      expect(body.data.url).toMatch(/^https?:\/\//)
    })

    it('201 upload cover with contentId', async () => {
      const token = generateTestToken(testUserId, testEmail)
      const contentId = 'content-456'
      const fileBuffer = Buffer.from('fake-cover-image')
      const { payload, headers } = buildMultipartPayload(fileBuffer, 'cover.png', {
        type: 'cover',
        contentId,
      })

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/upload',
        headers: {
          ...headers,
          authorization: `Bearer ${token}`,
        },
        payload,
      })

      expect(response.statusCode).toBe(201)
      const body = response.json()
      expect(body.success).toBe(true)
      expect(body.data.key).toContain('covers/')
      expect(body.data.key).toContain(contentId)
    })

    it('400 file type rejected (exe for avatar)', async () => {
      const token = generateTestToken(testUserId, testEmail)
      const fileBuffer = Buffer.from('fake-exe-content')
      const { payload, headers } = buildMultipartPayload(fileBuffer, 'malware.exe', {
        type: 'avatar',
      })

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/upload',
        headers: {
          ...headers,
          authorization: `Bearer ${token}`,
        },
        payload,
      })

      expect(response.statusCode).toBe(400)
      const body = response.json()
      expect(body.success).toBe(false)
      expect(body.error.type).toBe('VALIDATION_ERROR')
    })

    it('400 invalid file type parameter', async () => {
      const token = generateTestToken(testUserId, testEmail)
      const fileBuffer = Buffer.from('some-content')
      const { payload, headers } = buildMultipartPayload(fileBuffer, 'file.jpg', {
        type: 'invalidtype',
      })

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/upload',
        headers: {
          ...headers,
          authorization: `Bearer ${token}`,
        },
        payload,
      })

      expect(response.statusCode).toBe(400)
      const body = response.json()
      expect(body.success).toBe(false)
      expect(body.error.type).toBe('VALIDATION_ERROR')
    })

    it('401 unauthenticated request rejected', async () => {
      const fileBuffer = Buffer.from('fake-image-content')
      const { payload, headers } = buildMultipartPayload(fileBuffer, 'avatar.jpg', {
        type: 'avatar',
      })

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/upload',
        headers,
        payload,
      })

      expect(response.statusCode).toBe(401)
      const body = response.json()
      expect(body.success).toBe(false)
      expect(body.error.type).toBe('AUTH_ERROR')
    })

    it('401 invalid token rejected', async () => {
      const fileBuffer = Buffer.from('fake-image-content')
      const { payload, headers } = buildMultipartPayload(fileBuffer, 'avatar.jpg', {
        type: 'avatar',
      })

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/upload',
        headers: {
          ...headers,
          authorization: 'Bearer <REDACTED>',
        },
        payload,
      })

      expect(response.statusCode).toBe(401)
      const body = response.json()
      expect(body.success).toBe(false)
    })

    it('400 missing file field', async () => {
      const token = generateTestToken(testUserId, testEmail)
      const boundary = '----testboundary1234567890'
      // Only send type field, no file
      const payload = Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="type"\r\n\r\navatar\r\n--${boundary}--\r\n`,
      )

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/upload',
        headers: {
          'content-type': `multipart/form-data; boundary=${boundary}`,
          authorization: `Bearer ${token}`,
        },
        payload,
      })

      expect(response.statusCode).toBe(400)
      const body = response.json()
      expect(body.success).toBe(false)
    })
  })

  describe('DELETE /api/v1/upload', () => {
    it('200 delete own file successfully', async () => {
      const token = generateTestToken(testUserId, testEmail)
      const key = `avatars/${testUserId}/1234567890-test.jpg`

      const response = await app.inject({
        method: 'DELETE',
        url: '/api/v1/upload',
        headers: { authorization: `Bearer ${token}` },
        payload: { key },
      })

      expect(response.statusCode).toBe(200)
      const body = response.json()
      expect(body.success).toBe(true)
      expect(body.data.key).toBe(key)
    })

    it('403 cannot delete other users file', async () => {
      const token = generateTestToken(testUserId, testEmail)
      const key = `avatars/other-user-999/1234567890-test.jpg`

      const response = await app.inject({
        method: 'DELETE',
        url: '/api/v1/upload',
        headers: { authorization: `Bearer ${token}` },
        payload: { key },
      })

      expect(response.statusCode).toBe(403)
      const body = response.json()
      expect(body.success).toBe(false)
      expect(body.error.type).toBe('FORBIDDEN')
    })

    it('401 unauthenticated delete rejected', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/v1/upload',
        payload: { key: `avatars/${testUserId}/test.jpg` },
      })

      expect(response.statusCode).toBe(401)
    })
  })
})
