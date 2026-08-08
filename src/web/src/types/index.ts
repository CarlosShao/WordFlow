// ═══════════════════════════════════════════════════════════════
// Type Definitions — English Learner
// ═══════════════════════════════════════════════════════════════

// ── User & Profile ─────────────────────────────────────────────

export interface UserProfile {
  id: string
  username: string
  email?: string
  avatar?: string
  level: CEFRLevel
  joinDate: string
  streak: number
  totalWords: number
  totalReadingMinutes: number
  totalListeningMinutes: number
}

export type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'

// ── Content (Unified Reading + Listening + Video) ──────────────

export type ContentType = 'article' | 'video' | 'podcast'

export type ContentSource = 'BBC' | 'CNN' | 'NYT' | 'Reddit' | 'X' | 'Medium' | 'TED' | 'YouTube' | 'Netflix' | 'Spotify' | 'Apple Podcasts'

export type ContentCategory = 'news' | 'technology' | 'science' | 'culture' | 'business' | 'education' | 'entertainment' | 'lifestyle'

export interface ContentItem {
  id: string
  type: ContentType
  title: string
  summary: string
  source: ContentSource
  sourceUrl: string
  difficulty: CEFRLevel
  category: ContentCategory
  tags: string[]
  coverImage?: string
  publishedAt: string
  vocabularyCount: number

  // Article-specific
  segments?: ContentSegment[]

  // Video-specific
  videoUrl?: string
  duration?: number
  bilingualSubtitles?: SubtitleLine[]

  // Podcast-specific
  audioUrl?: string
  speaker?: string

  // Shared
  wordCount?: number
  estimatedMinutes?: number
  segmentPractice?: SegmentPracticeGroup[]
}

export interface ContentSegment {
  id: string
  index: number
  title?: string
  content: string
  translation?: string
  startTime?: number
  endTime?: number
  highlights?: string[]
}

export interface SubtitleLine {
  startTime: number
  endTime: number
  english: string
  chinese: string
}

export interface SegmentPracticeGroup {
  segmentId: string
  segmentTitle: string
  questions: PracticeQuestion[]
}

export interface ContentListResponse {
  items: ContentItem[]
  total: number
  page: number
  pageSize: number
}

// ── Dashboard ──────────────────────────────────────────────────

export interface DashboardStats {
  todayStudyMinutes: number
  todayWordsLearned: number
  streak: number
  weeklyGoalProgress: number
  totalWords: number
  totalArticles: number
  totalListeningHours: number
}

export interface HeatmapData {
  date: string
  count: number
}

export interface ChartDataPoint {
  label: string
  value: number
}

// ── Vocabulary ─────────────────────────────────────────────────

export interface Vocabulary {
  id: string
  word: string
  phonetic: string
  partOfSpeech: string
  definition: string
  chineseDefinition: string
  examples: ExampleSentence[]
  wordFamily: WordFamily[]
  etymology?: string
  frequency: number
  masteryLevel: number
  addedAt: string
  lastReviewedAt?: string
  nextReviewAt?: string
  source?: string
  tags: string[]
  reviewHistory?: Array<{
    date: string
    mastery: number
  }>
}

export interface ExampleSentence {
  id: string
  english: string
  chinese: string
  source: string
  sourceUrl?: string
  highlight?: string
}

export interface WordFamily {
  word: string
  partOfSpeech: string
  definition: string
}

// ── Examples ───────────────────────────────────────────────────

export interface ExampleSearchResult {
  id: string
  sentence: string
  translation: string
  source: string
  sourceUrl: string
  difficulty: CEFRLevel
  wordHighlight: string
  context?: string
}

// ── Practice ───────────────────────────────────────────────────

export interface PracticeQuestion {
  id: string
  type: PracticeType
  difficulty: CEFRLevel
  question: string
  passage?: string
  options?: string[]
  correctAnswer: string | string[]
  explanation: string
  points: number
  tags: string[]
}

export type PracticeType = 'cloze' | 'reading-comprehension' | 'grammar' | 'listening' | 'sentence-correction' | 'fill-blank' | 'true-false' | 'multiple-choice' | 'ordering'

export interface PracticeSession {
  id: string
  type: PracticeType
  questions: PracticeQuestion[]
  startedAt: string
  completedAt?: string
  score?: number
  totalPoints: number
}

// ── Mistakes ───────────────────────────────────────────────────

export interface MistakeRecord {
  id: string
  questionId: string
  question: PracticeQuestion
  userAnswer: string | string[]
  correctAnswer: string | string[]
  reviewedAt: string
  masteryStatus: 'not-reviewed' | 'reviewing' | 'mastered'
  reviewCount: number
}

// ── Settings ───────────────────────────────────────────────────

export interface UserSettings {
  dailyGoalMinutes: number
  dailyGoalWords: number
  reminderEnabled: boolean
  reminderTime: string
  difficultyPreference: CEFRLevel[]
  preferredSources: ContentSource[]
  theme: 'light' | 'dark' | 'system'
  fontSize: 'sm' | 'md' | 'lg'
}

// ── API Response ───────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
  error?: string
}

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// ── Legacy Types ──────────────────────────────────────────────
// Kept for backward compatibility with existing mocks/apis

export interface Article {
  id: string
  title: string
  content: string
  summary: string
  source: string
  sourceUrl: string
  difficulty: CEFRLevel
  wordCount: number
  estimatedMinutes: number
  tags: string[]
  vocabularyCount: number
  publishedAt: string
  coverImage?: string
}

export interface ArticleListResponse {
  articles: Article[]
  total: number
  page: number
  pageSize: number
}

export type ArticleSource = string

export interface ListeningMaterial {
  id: string
  title: string
  audioUrl: string
  duration: number
  transcript: string
  source: string
  difficulty: CEFRLevel
  tags: string[]
  speaker?: string
}

export interface ListeningQuestion {
  id: string
  materialId: string
  type: PracticeType
  question: string
  options?: string[]
  correctAnswer: string
  explanation: string
  timestamp: number
}
