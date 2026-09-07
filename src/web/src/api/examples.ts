import client from './client'
import type { ExampleSearchResult, CEFRLevel } from '../types'

// 后端 GET /api/v1/ai/examples/search 命中结构
interface BackendExampleHit {
  word: string
  translation: string | null
  sentence: string
  sentenceTranslation: string | null
  source: 'dictionary' | 'vocabulary'
}

function mapHit(hit: BackendExampleHit, idx: number, difficulty?: CEFRLevel): ExampleSearchResult {
  return {
    id: `${hit.source}-${hit.word}-${idx}`,
    sentence: hit.sentence,
    // 优先用例句自带的翻译，其次词条释义
    translation: hit.sentenceTranslation ?? hit.translation ?? '',
    source: hit.source === 'dictionary' ? '词典' : '我的词汇',
    sourceUrl: '',
    difficulty: difficulty ?? null,
    wordHighlight: hit.word,
    context: hit.translation ?? undefined,
  }
}

export const examplesApi = {
  async search(params: {
    keyword: string
    difficulty?: CEFRLevel
    source?: 'dictionary' | 'vocabulary'
    page?: number
    limit?: number
  }): Promise<ExampleSearchResult[]> {
    const data = await client.get('/api/v1/ai/examples/search', {
      params: params as Record<string, string | number | boolean>,
    })
    const hits = (Array.isArray(data) ? data : []) as unknown as BackendExampleHit[]
    return hits.map((hit, idx) => mapHit(hit, idx, params.difficulty))
  },
}
