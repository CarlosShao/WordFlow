import { Client as MinioClient } from 'minio'
import { logger } from '../common/logger.js'
import { config } from '../config/index.js'

let minio: MinioClient | undefined

export function getMinio(): MinioClient {
  if (!minio) {
    minio = new MinioClient({
      endPoint: config.minio.endpoint,
      port: config.minio.port,
      useSSL: config.minio.useSSL,
      accessKey: config.minio.accessKey,
      secretKey: config.minio.secretKey,
    })
    logger.info('MinIO client initialized')
  }
  return minio
}

export async function ensureBucket(bucket: string): Promise<void> {
  const client = getMinio()
  const exists = await client.bucketExists(bucket)
  if (!exists) {
    await client.makeBucket(bucket)
    logger.info({ bucket }, 'Created MinIO bucket')
  }
}

export function buildUserKey(userId: string, filename: string): string {
  const timestamp = Date.now()
  return `${userId}/${timestamp}-${filename}`
}

export async function disconnectMinio(): Promise<void> {
  // MinIO client is stateless, no explicit disconnect needed
}
