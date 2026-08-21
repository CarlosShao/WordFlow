import client from './client'

export interface DictionaryExample {
  en: string
  cn: string
}

export interface DictionaryRelatedWord {
  word: string
  pos: string
  translation?: string
}

export interface DictionaryEntry {
  word: string
  phonetic: {
    us?: string
    uk?: string
    usAudio?: string
    ukAudio?: string
  }
  translations: { pos: string; cn: string }[]
  definitions: { pos: string; en: string; synonyms?: string[] }[]
  examples: DictionaryExample[]
  synonyms: string[]
  antonyms: string[]
  relatedWords: DictionaryRelatedWord[]
  exams: string[]
  source: 'youdao' | 'dictcn'
}

export const dictionaryApi = {
  /** 查询单词释义（有道主力 + 海词兜底，后端处理） */
  async lookup(word: string): Promise<DictionaryEntry> {
    const data = await client.get(`/api/v1/dictionary/${encodeURIComponent(word)}`)
    return data as unknown as DictionaryEntry
  },
}