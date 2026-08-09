import client from './client'
import type { ExampleSearchResult, CEFRLevel } from '../types'

export const examplesApi = {
  async search(params: {
    keyword: string
    difficulty?: CEFRLevel
    source?: string
  }): Promise<ExampleSearchResult[]> {
    const data = await client.get('/api/v1/ai/examples/search', { params: params as Record<string, string | number | boolean> })
    return data as unknown as ExampleSearchResult[]
  },

  async getByWord(word: string): Promise<ExampleSearchResult[]> {
    const data = await client.get('/api/v1/ai/examples', { params: { word } })
    return data as unknown as ExampleSearchResult[]
  },
}
