// Upload type definitions and constraints

export type FileType = 'avatar' | 'cover' | 'media' | 'document'

export interface FileTypeConfig {
  allowedMimeTypes: string[]
  allowedExtensions: string[]
  maxBytes: number
}

export const FILE_TYPE_CONFIGS: Record<FileType, FileTypeConfig> = {
  avatar: {
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
    maxBytes: 2 * 1024 * 1024, // 2MB
  },
  cover: {
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp'],
    maxBytes: 5 * 1024 * 1024, // 5MB
  },
  media: {
    allowedMimeTypes: ['audio/mpeg', 'video/mp4', 'audio/wav', 'video/quicktime'],
    allowedExtensions: ['.mp3', '.mp4', '.wav', '.mov'],
    maxBytes: 100 * 1024 * 1024, // 100MB
  },
  document: {
    allowedMimeTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
    ],
    allowedExtensions: ['.pdf', '.doc', '.docx', '.txt'],
    maxBytes: 10 * 1024 * 1024, // 10MB
  },
}

export const VALID_FILE_TYPES: FileType[] = ['avatar', 'cover', 'media', 'document']

export interface UploadResult {
  url: string
  key: string
  size: number
  mimetype: string
}
