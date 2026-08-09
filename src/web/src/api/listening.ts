import client from './client'
import type { ListeningMaterial, ListeningQuestion, CEFRLevel } from '../types'

export const listeningApi = {
  async getList(params?: {
    difficulty?: CEFRLevel
    tags?: string[]
  }): Promise<ListeningMaterial[]> {
    const data = await client.get('/api/v1/content', { params: { ...params, type: 'podcast' } as unknown as Record<string, string | number | boolean> })
    return data as unknown as ListeningMaterial[]
  },

  async getById(id: string): Promise<ListeningMaterial> {
    const data = await client.get(`/api/v1/content/${id}`)
    return data as unknown as ListeningMaterial
  },

  async getQuestions(materialId: string): Promise<ListeningQuestion[]> {
    const data = await client.get('/api/v1/practice/questions', { params: { contentId: materialId, type: 'listening' } })
    return data as unknown as ListeningQuestion[]
  },
}
