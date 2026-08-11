import client from './client'
import type { PracticeQuestion, PracticeType, CEFRLevel, PracticeSession } from '../types'

// 前端练习类型 → 后端 questionTypes 枚举（与后端 QUESTION_TYPE_MAP 的 key 对齐）
const PRACTICE_TYPE_TO_QUESTION_TYPES: Record<string, string[]> = {
  'cloze': ['FILL_BLANK'],
  'fill-blank': ['FILL_BLANK'],
  'reading-comprehension': ['READING_COMPREHENSION'],
  'grammar': ['MULTIPLE_CHOICE'],
  'sentence-correction': ['MULTIPLE_CHOICE'],
  'listening': ['LISTENING'],
  'multiple-choice': ['MULTIPLE_CHOICE'],
  'true-false': ['MULTIPLE_CHOICE'],
  'ordering': ['MULTIPLE_CHOICE'],
  // 兼容旧值
  CLOZE: ['FILL_BLANK'],
  LISTENING: ['LISTENING'],
  VOCABULARY: ['MULTIPLE_CHOICE', 'TRANSLATION'],
  TRANSLATION: ['TRANSLATION'],
  FILL_BLANK: ['FILL_BLANK'],
  MULTIPLE_CHOICE: ['MULTIPLE_CHOICE'],
}

// 将后端返回的 practice 题目映射为前端 PracticeQuestion 结构
function normalizeQuestion(q: Record<string, unknown>, difficulty: CEFRLevel): PracticeQuestion {
  return {
    id: q.id as string,
    type: (q.type as PracticeType) ?? 'multiple-choice',
    difficulty,
    question: (q.stem as string) ?? (q.question as string) ?? '',
    passage: (q.passage as string) ?? undefined,
    options: (q.options as string[]) ?? undefined,
    correctAnswer: q.correctAnswer as string,
    explanation: (q.explanation as string) ?? '',
    points: 1,
    tags: [],
  }
}

export interface AnswerResult {
  correct: boolean
  correctAnswer: string | string[]
  explanation: string
  points: number
}

export const practiceApi = {
  // 创建练习会话（后端：POST /api/v1/practice）
  async createSession(params: {
    type: PracticeType
    difficulty?: CEFRLevel
    contentId?: string
    questionCount?: number
  }): Promise<PracticeSession> {
    const data = await client.post('/api/v1/practice', {
      questionTypes: PRACTICE_TYPE_TO_QUESTION_TYPES[String(params.type)] ?? ['MULTIPLE_CHOICE'],
      questionCount: params.questionCount ?? 10,
      contentId: params.contentId,
      title: `练习 ${new Date().toLocaleDateString('zh-CN')}`,
    })
    const session = data as unknown as {
      id: string
      questions?: Array<Record<string, unknown>>
      totalQuestions?: number
    }
    return {
      id: session.id,
      type: params.type,
      questions: (session.questions ?? []).map((q) => normalizeQuestion(q, params.difficulty ?? 'B1')),
      startedAt: new Date().toISOString(),
      totalPoints: session.totalQuestions ?? (session.questions?.length ?? 0),
    }
  },

  // 获取会话题目（后端无独立题目接口，统一创建会话后取 questions）
  async getQuestions(params?: {
    type?: PracticeType
    difficulty?: CEFRLevel
    limit?: number
  }): Promise<PracticeQuestion[]> {
    const session = await this.createSession({
      type: params?.type ?? 'VOCABULARY',
      difficulty: params?.difficulty,
      questionCount: params?.limit ?? 10,
    })
    return session.questions
  },

  async getById(id: string): Promise<PracticeQuestion> {
    const data = await client.get(`/api/v1/practice/questions/${id}`)
    return data as unknown as PracticeQuestion
  },

  // 提交单题答案（后端：POST /api/v1/practice/:id/submit）
  async submitAnswer(sessionId: string, questionId: string, answer: string | string[]): Promise<AnswerResult> {
    const data = await client.post(`/api/v1/practice/${sessionId}/submit`, {
      questionId,
      answer,
    })
    const result = data as unknown as { isCorrect: boolean; correctAnswer: string; explanation?: string }
    return {
      correct: result.isCorrect,
      correctAnswer: result.correctAnswer,
      explanation: result.explanation ?? '',
      points: result.isCorrect ? 1 : 0,
    }
  },

  // 直接提交（无会话）—— 后端要求会话，必须走 submitAnswer
  async submitAnswerDirect(questionId: string, answer: string | string[]): Promise<AnswerResult> {
    throw new Error('需要会话才能提交答案，请先创建练习会话')
  },

  // 完成会话（后端：POST /api/v1/practice/:id/complete）
  async completeSession(sessionId: string): Promise<{ score: number; totalPoints: number; correctCount: number }> {
    const data = await client.post(`/api/v1/practice/${sessionId}/complete`)
    const result = data as unknown as { score: number; correctCount: number; stats?: { correctCount: number } }
    return {
      score: result.score ?? 0,
      totalPoints: 0,
      correctCount: result.correctCount ?? result.stats?.correctCount ?? 0,
    }
  },

  // 获取会话（后端：GET /api/v1/practice/:id）
  async getSession(sessionId: string): Promise<PracticeSession> {
    const data = await client.get(`/api/v1/practice/${sessionId}`)
    const session = data as unknown as {
      id: string
      questions?: Array<Record<string, unknown>>
      totalQuestions?: number
    }
    return {
      id: session.id,
      type: 'VOCABULARY',
      questions: (session.questions ?? []).map((q) => normalizeQuestion(q, 'B1')),
      startedAt: new Date().toISOString(),
      totalPoints: session.totalQuestions ?? (session.questions?.length ?? 0),
    }
  },
}
