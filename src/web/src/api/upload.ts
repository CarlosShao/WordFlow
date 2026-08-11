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
}
