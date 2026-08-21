import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import { AppError, ErrorType } from '../../common/errors.js'
import { logger } from '../../common/logger.js'
import { getPrisma } from '../../common/prisma.js'
import {
  validateFileType,
  processUpload,
  deleteFile,
  buildFileUrl,
} from './service.js'
import { getMinio } from '../../common/minio.js'
import { config } from '../../config/index.js'

// ------------------- Schemas -------------------

const deleteSchema = z.object({
  key: z.string().min(1, '文件 key 不能为空'),
})

// ------------------- Routes -------------------

export async function uploadRoutes(app: FastifyInstance) {
  // ---- Upload file ----
  app.post('/api/v1/upload', { preHandler: [app.authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user!.id

    // Parse multipart form data
    const parts = request.parts()
    let fileBuffer: Buffer | null = null
    let filename = ''
    let mimetype = ''
    let fileType = ''
    let contentId: string | undefined

    for await (const part of parts) {
      if (part.type === 'file') {
        filename = part.filename
        mimetype = part.mimetype
        // Collect the file stream into a buffer
        const chunks: Buffer[] = []
        for await (const chunk of part.file) {
          chunks.push(chunk as Buffer)
        }
        fileBuffer = Buffer.concat(chunks)

        // Check for file truncation (size limit hit by @fastify/multipart)
        if (part.file.truncated) {
          throw new AppError(
            ErrorType.VALIDATION,
            '文件大小超出限制',
            400,
          )
        }
      } else {
        // Field
        const fieldname = part.fieldname
        const value = part.value as string
        if (fieldname === 'type') {
          fileType = value
        } else if (fieldname === 'contentId') {
          contentId = value
        }
      }
    }

    // Validate required fields
    if (!fileBuffer) {
      throw new AppError(ErrorType.VALIDATION, '未找到上传文件', 400)
    }
    if (!fileType) {
      throw new AppError(ErrorType.VALIDATION, '缺少文件类型参数 (type)', 400)
    }

    // Validate file type
    const validatedType = validateFileType(fileType)

    // Process upload
    const result = await processUpload(
      filename,
      mimetype,
      fileBuffer.length,
      fileBuffer,
      validatedType,
      userId,
      contentId,
    )

    if (validatedType === 'avatar') {
      const prisma = getPrisma()
      await prisma.user.update({ where: { id: userId }, data: { avatarUrl: result.url } })
    }

    logger.info(
      { userId, fileType: validatedType, key: result.key, size: result.size },
      'File uploaded successfully',
    )

    return reply.code(201).send({ success: true, data: result })
  })

  // ---- Delete file ----
  app.delete('/api/v1/upload', { preHandler: [app.authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user!.id
    const { key } = deleteSchema.parse(request.body)

    // Only allow deleting own files (key starts with user-scoped prefix)
    // For MVP, we check the key pattern: avatars/${userId}/, documents/${userId}/
    // For covers and media, contentId is used; ownership check would require DB lookup
    // Simplified: allow delete if key contains userId
    if (!key.includes(userId)) {
      throw new AppError(ErrorType.FORBIDDEN, '无权删除此文件', 403)
    }

    await deleteFile(key)

    logger.info({ userId, key }, 'File deleted successfully')
    return reply.send({ success: true, data: { key } })
  })

  // ---- Get file info (useful for client) ----
  app.get('/api/v1/upload/url', { preHandler: [app.authenticate] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const query = request.query as { key?: string }
    if (!query.key) {
      throw new AppError(ErrorType.VALIDATION, '缺少 key 参数', 400)
    }
    const url = buildFileUrl(query.key)
    return reply.send({ success: true, data: { url } })
  })

  // ---- Proxy file content (browser-safe avatar/file access) ----
  // Direct MinIO URL like http://minio:9000/... is unreachable from the browser
  // when the API runs inside Docker. This proxy streams the object through the
  // API with correct Content-Type + CORS, so <img src> never breaks.
  app.get('/api/v1/upload/file', async (request: FastifyRequest, reply: FastifyReply) => {
    const query = request.query as { key?: string }
    if (!query.key) {
      throw new AppError(ErrorType.VALIDATION, '缺少 key 参数', 400)
    }
    const key = query.key
    const bucket = config.minio.bucket
    const client = getMinio()
    try {
      const stat = await client.statObject(bucket, key)
      const stream = await client.getObject(bucket, key)
      const contentType = (stat.metaData?.['content-type'] as string) || 'application/octet-stream'
      return reply
        .header('Content-Type', contentType)
        .header('Cache-Control', 'public, max-age=86400')
        .header('Access-Control-Allow-Origin', '*')
        .header('Cross-Origin-Resource-Policy', 'cross-origin')
        .send(stream)
    } catch (e) {
      throw new AppError(ErrorType.NOT_FOUND, '文件不存在', 404)
    }
  })
}
