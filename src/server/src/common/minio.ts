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
  try {
    const policy = JSON.stringify({
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Principal: '*',
          Action: ['s3:GetObject'],
          Resource: [`arn:aws:s3:::${bucket}/*`],
        },
      ],
    })
    await client.setBucketPolicy(bucket, policy)
  } catch (e) {
    logger.warn({ err: (e as Error).message, bucket }, 'Failed to set bucket policy')
  }
}

export function buildUserKey(userId: string, filename: string): string {
  const timestamp = Date.now()
  return `${userId}/${timestamp}-${filename}`
}

export async function disconnectMinio(): Promise<void> {
  // MinIO client is stateless, no explicit disconnect needed
}
