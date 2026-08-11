/**
 * AI Processing Module Types
 *
 * Content pipeline: extract vocabulary, generate summary, rate difficulty, write vocabulary.
 */

import type { JsonValue } from '@prisma/client/runtime/library'

export interface ExtractedVocabulary {
  word: string
  phonetic?: string | null
  translation: string | null
  definition?: string | null
  examples?: JsonValue
}

export interface DifficultyRating {
  difficulty: 'BEGINNER' | 'ELEMENTARY' | 'INTERMEDIATE' | 'UPPER_INTERMEDIATE' | 'ADVANCED' | 'PROFICIENT'
  reason: string
}

export interface ProcessingResult {
  contentId: string
  vocabularyExtracted: number
  summaryGenerated: boolean
  difficultyRated: boolean
  vocabulary: ExtractedVocabulary[]
}

export interface BatchProcessingResult {
  processed: number
  failed: number
  results: ProcessingResult[]
}

export interface BatchRequest {
  limit: number
  type?: 'ARTICLE' | 'VIDEO' | 'PODCAST'
}
