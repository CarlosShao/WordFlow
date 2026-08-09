import path from 'node:path'
import { getMinio, ensureBucket } from '../../common/minio.js'
import { AppError, ErrorType } from '../../common/errors.js'
import { config } from '../../config/index.js'
import {
  FILE_TYPE_CONFIGS,
  VALID_FILE_TYPES,
  type FileType,
  type UploadResult,
} from './types.js'

/**
 * Sanitize a filename to prevent path traversal and other injection attacks.
 * Strips directory components and removes dangerous characters.
 */
export function sanitizeFilename(filename: string): string {
  // Extract just the basename (no directory components)
  const base = path.basename(filename)
  // Remove any null bytes
  const cleaned = base.replace(/\0/g, '')
  // Replace path traversal patterns
  return cleaned.replace(/^[./\\]+$/, 'file')
}

/**
 * Validate a file type parameter.
 * Throws AppError if the type is not recognized.
 */
export function validateFileType(type: string): FileType {
  if (!VALID_FILE_TYPES.includes(type as FileType)) {
    throw new AppError(
      ErrorType.VALIDATION,
      `无效的文件类型: ${type}。支持: ${VALID_FILE_TYPES.join(', ')}`,
      400,
    )
  }
  return type as FileType
}

/**
 * Validate a file's mimetype and extension against the configured type constraints.
 * Throws AppError if validation fails.
 */
export function validateFile(
  filename: string,
  mimetype: string,
  fileType: FileType,
): void {
  const cfg = FILE_TYPE_CONFIGS[fileType]
  const ext = path.extname(filename).toLowerCase()

  if (!cfg.allowedExtensions.includes(ext)) {
    throw new AppError(
      ErrorType.VALIDATION,
      `不支持的文件扩展名: ${ext}。${fileType} 类型支持: ${cfg.allowedExtensions.join(', ')}`,
      400,
    )
  }

  if (!cfg.allowedMimeTypes.includes(mimetype)) {
    throw new AppError(
      ErrorType.VALIDATION,
      `不支持的文件格式: ${mimetype}。${fileType} 类型支持: ${cfg.allowedMimeTypes.join(', ')}`,
      400,
    )
  }
}

/**
 * Check file size against the configured limit for the given type.
 */
export function validateFileSize(size: number, fileType: FileType): void {
  const cfg = FILE_TYPE_CONFIGS[fileType]
  if (size > cfg.maxBytes) {
    const maxMB = cfg.maxBytes / (1024 * 1024)
    throw new AppError(
      ErrorType.VALIDATION,
      `文件大小超出限制: ${(size / (1024 * 1024)).toFixed(2)}MB。${fileType} 最大: ${maxMB}MB`,
      400,
    )
  }
}

/**
 * Build the storage key for a file based on its type.
 */
export function buildStorageKey(
  fileType: FileType,
  userId: string,
  contentId: string | undefined,
  filename: string,
): string {
  const timestamp = Date.now()
  const safeName = sanitizeFilename(filename)

  switch (fileType) {
    case 'avatar':
      return `avatars/${userId}/${timestamp}-${safeName}`
    case 'cover':
      return `covers/${contentId ?? userId}/${timestamp}-${safeName}`
    case 'media':
      return `media/${contentId ?? userId}/${timestamp}-${safeName}`
    case 'document':
      return `documents/${userId}/${timestamp}-${safeName}`
  }
}

/**
 * Build the public URL for an uploaded file.
 */
export function buildFileUrl(key: string): string {
  const protocol = config.minio.useSSL ? 'https' : 'http'
  return `${protocol}://${config.minio.endpoint}:${config.minio.port}/${config.minio.bucket}/${key}`
}

/**
 * Upload a file buffer to MinIO.
 */
export async function uploadFile(
  key: string,
  buffer: Buffer,
  mimetype: string,
): Promise<void> {
  const client = getMinio()
  const bucket = config.minio.bucket

  await ensureBucket(bucket)

  await client.putObject(bucket, key, buffer, buffer.length, {
    'Content-Type': mimetype,
  })
}

/**
 * Delete a file from MinIO.
 */
export async function deleteFile(key: string): Promise<void> {
  const client = getMinio()
  const bucket = config.minio.bucket

  await client.removeObject(bucket, key)
}

/**
 * Full upload pipeline: validate, upload to MinIO, return result.
 */
export async function processUpload(
  filename: string,
  mimetype: string,
  size: number,
  buffer: Buffer,
  fileType: FileType,
  userId: string,
  contentId?: string,
): Promise<UploadResult> {
  // Validate
  validateFile(filename, mimetype, fileType)
  validateFileSize(size, fileType)

  // Build storage key
  const key = buildStorageKey(fileType, userId, contentId, filename)

  // Upload to MinIO
  await uploadFile(key, buffer, mimetype)

  // Build URL
  const url = buildFileUrl(key)

  return { url, key, size, mimetype }
}
