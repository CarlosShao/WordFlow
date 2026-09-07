import type { MistakeRecord } from '../types'

export const mockMistakes: MistakeRecord[] = [
  {
    id: 'mk-001',
    questionId: 'pq-001',
    questionType: 'CLOZE',
    question: 'The company decided to _____ its operations to new markets.',
    correctAnswer: 'expand',
    userAnswer: 'expend',
    wrongAnswer: 'expend',
    explanation: '"Expand" means to become or make larger. In this context, it means extending business operations to new markets.',
    difficulty: 'INTERMEDIATE',
    masteryStatus: 'REVIEWING',
    reviewCount: 2,
    lastWrongAt: '2024-01-20T00:00:00.000Z'
  },
  {
    id: 'mk-002',
    questionId: 'pq-004',
    questionType: 'GRAMMAR',
    question: 'Choose the correct sentence:',
    correctAnswer: 'If I had known, I would have helped.',
    userAnswer: 'If I would have known, I would have helped.',
    wrongAnswer: 'If I would have known, I would have helped.',
    explanation: 'This is the third conditional (past unreal conditional). The correct structure is: If + past perfect, would have + past participle.',
    difficulty: 'INTERMEDIATE',
    masteryStatus: 'NOT_REVIEWED',
    reviewCount: 0,
    lastWrongAt: '2024-01-22T00:00:00.000Z'
  },
  {
    id: 'mk-003',
    questionId: 'pq-005',
    questionType: 'GRAMMAR',
    question: 'Identify the error: "Despite of the rain, we decided to go for a walk."',
    correctAnswer: 'Despite of → Despite',
    userAnswer: 'the rain → rain',
    wrongAnswer: 'the rain → rain',
    explanation: '"Despite" is a preposition and does not take "of" after it. Use "despite" or "in spite of" (not "despite of").',
    difficulty: 'UPPER_INTERMEDIATE',
    masteryStatus: 'REVIEWING',
    reviewCount: 1,
    lastWrongAt: '2024-01-25T00:00:00.000Z'
  }
]
