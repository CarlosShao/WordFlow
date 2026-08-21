import type { CEFRLevel, ContentSource } from '../types'

/** A1–C2 difficulty filter options shared by reading/practice/listening pages. */
export const DIFFICULTY_LEVELS: Array<{ value: CEFRLevel; label: string }> = [
  { value: 'A1', label: 'A1 入门' },
  { value: 'A2', label: 'A2 基础' },
  { value: 'B1', label: 'B1 中级' },
  { value: 'B2', label: 'B2 中高级' },
  { value: 'C1', label: 'C1 高级' },
  { value: 'C2', label: 'C2 精通' },
]

/** Content sources offered by the crawler UI. */
export const SOURCES: ContentSource[] = ['BBC', 'CNN', 'NYT', 'Reddit', 'X', 'Medium', 'TED', 'YouTube']
