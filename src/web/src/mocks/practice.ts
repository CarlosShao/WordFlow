import type { PracticeQuestion } from '../types'

export const mockPracticeQuestions: PracticeQuestion[] = [
  {
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
  {
    id: 'pq-002',
    type: 'cloze',
    difficulty: 'B2',
    question: 'The scientist made a _____ discovery that changed our understanding of the universe.',
    options: ['groundbreaking', 'grounding', 'grounded', 'ground'],
    correctAnswer: 'groundbreaking',
    explanation: '"Groundbreaking" means innovative and pioneering. It describes something that breaks new ground or establishes a new foundation.',
    points: 15,
    tags: ['academic', 'adjectives']
  },
  {
    id: 'pq-003',
    type: 'reading-comprehension',
    difficulty: 'B2',
    passage: `Remote work has become increasingly common in recent years. While many employees appreciate the flexibility it offers, some studies suggest that remote workers may experience feelings of isolation and difficulty separating work from personal life. Companies are now exploring hybrid models that combine the benefits of both remote and in-office work.`,
    question: 'What is one potential drawback of remote work mentioned in the passage?',
    options: [
      'Higher costs for employers',
      'Feelings of isolation',
      'Reduced productivity',
      'Lack of technology'
    ],
    correctAnswer: 'Feelings of isolation',
    explanation: 'The passage explicitly mentions that "remote workers may experience feelings of isolation."',
    points: 20,
    tags: ['reading', 'comprehension']
  },
  {
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
  {
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
  {
    id: 'pq-006',
    type: 'cloze',
    difficulty: 'C1',
    question: 'The politician tried to _____ the controversial issue by changing the subject.',
    options: ['sidestep', 'sideline', 'sidetrack', 'sidewalk'],
    correctAnswer: 'sidestep',
    explanation: '"Sidestep" means to avoid dealing with something difficult. The politician is trying to avoid the controversial issue.',
    points: 20,
    tags: ['vocabulary', 'idioms']
  }
]
