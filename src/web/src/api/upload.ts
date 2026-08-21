import client from './client'

export type UploadType = 'avatar' | 'cover' | 'document' | 'audio' | 'media'

export interface UploadResult {
  key: string
  url: string
  size: number
  filename: string
  mimetype: string
}

export const uploadApi = {
  // 上传文件（后端：POST /api/v1/upload，multipart/form-data）
  // form 字段：file（二进制）、type（UploadType）、contentId（可选）
  async uploadFile(file: File, type: UploadType, contentId?: string): Promise<UploadResult> {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('type', type)
    if (contentId) formData.append('contentId', contentId)

    const data = await client.post('/api/v1/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return (data as unknown as UploadResult) ?? ({} as UploadResult)
  },

  // 删除文件（后端：DELETE /api/v1/upload，body: { key }）
  async deleteFile(key: string): Promise<void> {
    await client.delete('/api/v1/upload', { data: { key } })
  },

  // 获取文件访问 URL（后端：GET /api/v1/upload/url?key=）
  async getFileUrl(key: string): Promise<string> {
    const data = await client.get('/api/v1/upload/url', { params: { key } })
    const result = (data as unknown as { url?: string }) ?? {}
    return result.url ?? ''
  },

  proxyUrlForKey(key: string): string {
    const base = (import.meta.env.VITE_API_BASE_URL as string | undefined) || 'http://localhost:3002'
    return `${base.replace(/\/$/, '')}/api/v1/upload/file?key=${encodeURIComponent(key)}`
  },

  normalizeAvatarUrl(url: string | undefined, key?: string): string | undefined {
    if (key) return this.proxyUrlForKey(key)
    if (!url) return url
    const host = (() => { try { return new URL(url).hostname } catch { return '' } })()
    if (host === 'minio' || host === 'wordflow-minio') {
      const k = (() => { try { const u = new URL(url); const parts = u.pathname.split('/').filter(Boolean); return parts.slice(1).join('/') } catch { return '' } })()
      if (k) return this.proxyUrlForKey(k)
    }
    return url
  },
}
