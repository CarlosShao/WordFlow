import type { MistakeRecord } from '../types'

export const mockMistakes: MistakeRecord[] = [
  {
    id: 'mk-001',
    questionId: 'pq-001',
    question: {
      id: 'pq-001',
      type: 'cloze',
      difficulty: 'B1',
      question: 'The company decided to _____ its operations to new markets.',
      options: ['expand', 'expand', 'expend', 'expense'],
      correctAnswer: 'expand',
      explanation: '"Expand" means to become or make larger. In this context, it means extending business operations to new markets.',
      points: 10,
      tags: ['business', 'vocabulary']
    },
    userAnswer: 'expend',
    correctAnswer: 'expand',
    reviewedAt: '2024-01-20',
    masteryStatus: 'reviewing',
    reviewCount: 2
  },
  {
    id: 'mk-002',
    questionId: 'pq-004',
    question: {
      id: 'pq-004',
      type: 'grammar',
      difficulty: 'B1',
      question: 'Choose the correct sentence:',
      options: [
        'If I would have known, I would have helped.',
        'If I had known, I would have helped.',
        'If I knew, I would helped.',
        'If I know, I would have helped.'
      ],
      correctAnswer: 'If I had known, I would have helped.',
      explanation: 'This is the third conditional (past unreal conditional). The correct structure is: If + past perfect, would have + past participle.',
      points: 15,
      tags: ['grammar', 'conditionals']
    },
    userAnswer: 'If I would have known, I would have helped.',
    correctAnswer: 'If I had known, I would have helped.',
    reviewedAt: '2024-01-22',
    masteryStatus: 'not-reviewed',
    reviewCount: 0
  },
  {
    id: 'mk-003',
    questionId: 'pq-005',
    question: {
      id: 'pq-005',
      type: 'sentence-correction',
      difficulty: 'B2',
      question: 'Identify the error: "Despite of the rain, we decided to go for a walk."',
      options: [
        'Despite of → Despite',
        'the rain → rain',
        'decided to go → decided going',
        'for a walk → to a walk'
      ],
      correctAnswer: 'Despite of → Despite',
      explanation: '"Despite" is a preposition and does not take "of" after it. Use "despite" or "in spite of" (not "despite of").',
      points: 15,
      tags: ['grammar', 'prepositions']
    },
    userAnswer: 'the rain → rain',
    correctAnswer: 'Despite of → Despite',
    reviewedAt: '2024-01-25',
    masteryStatus: 'reviewing',
    reviewCount: 1
  }
]
