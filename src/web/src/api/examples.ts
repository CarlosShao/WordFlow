import type { ApiResponse, ExampleSearchResult, CEFRLevel } from '../types'
import { mockExamples } from '../mocks'

const delay = (ms: number = 300) => new Promise(resolve => setTimeout(resolve, ms))

export const examplesApi = {
  async search(params: {
    keyword: string
    difficulty?: CEFRLevel
    source?: string
  }): Promise<ApiResponse<ExampleSearchResult[]>> {
    await delay(500)
    const { keyword, difficulty, source } = params
    
    const lowerKeyword = keyword.toLowerCase()
    let results = mockExamples.filter(e => 
      e.sentence.toLowerCase().includes(lowerKeyword) ||
      e.translation.includes(keyword) ||
      e.wordHighlight.toLowerCase() === lowerKeyword
    )
    
    if (difficulty) {
      results = results.filter(e => e.difficulty === difficulty)
    }
    if (source) {
      results = results.filter(e => e.source.toLowerCase().includes(source.toLowerCase()))
    }
    
    return {
      success: true,
      data: results
    }
  },

  async getByWord(word: string): Promise<ApiResponse<ExampleSearchResult[]>> {
    await delay()
    const lowerWord = word.toLowerCase()
    const results = mockExamples.filter(e => 
      e.wordHighlight.toLowerCase() === lowerWord ||
      e.sentence.toLowerCase().includes(lowerWord)
    )
    return {
      success: true,
      data: results
    }
  }
}
