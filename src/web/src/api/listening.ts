import type { ApiResponse, ListeningMaterial, ListeningQuestion, CEFRLevel } from '../types'
import { mockListeningMaterials, mockListeningQuestions } from '../mocks'

const delay = (ms: number = 300) => new Promise(resolve => setTimeout(resolve, ms))

export const listeningApi = {
  async getList(params?: {
    difficulty?: CEFRLevel
    tags?: string[]
  }): Promise<ApiResponse<ListeningMaterial[]>> {
    await delay()
    const { difficulty, tags } = params || {}
    
    let filtered = [...mockListeningMaterials]
    
    if (difficulty) {
      filtered = filtered.filter(m => m.difficulty === difficulty)
    }
    if (tags && tags.length > 0) {
      filtered = filtered.filter(m => tags.some(t => m.tags.includes(t)))
    }
    
    return {
      success: true,
      data: filtered
    }
  },

  async getById(id: string): Promise<ApiResponse<ListeningMaterial | null>> {
    await delay()
    const material = mockListeningMaterials.find(m => m.id === id)
    return {
      success: !!material,
      data: material || null,
      error: material ? undefined : 'Material not found'
    }
  },

  async getQuestions(materialId: string): Promise<ApiResponse<ListeningQuestion[]>> {
    await delay()
    const questions = mockListeningQuestions.filter(q => q.materialId === materialId)
    return {
      success: true,
      data: questions
    }
  }
}
