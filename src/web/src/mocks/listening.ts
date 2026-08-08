import type { ListeningMaterial, ListeningQuestion } from '../types'

export const mockListeningMaterials: ListeningMaterial[] = [
  {
    id: 'lsn-001',
    title: 'How to Build Better Habits',
    audioUrl: '/audio/habits.mp3',
    duration: 300,
    transcript: `Welcome to today's talk about building better habits. Many of us struggle to maintain positive changes in our lives, but research in behavioral psychology offers some valuable insights.

The key to habit formation is understanding the habit loop: cue, routine, and reward. Every habit follows this pattern. The cue triggers the behavior, the routine is the behavior itself, and the reward reinforces the loop.

To build a new habit, start by making it obvious. Place your running shoes by the door if you want to exercise in the morning. Make it attractive by pairing it with something you enjoy. Make it easy by starting with just two minutes. And make it satisfying by tracking your progress.

Remember, habits are not about perfection. They're about consistency. Missing one day doesn't break the chain—it's missing two consecutive days that starts to form a new, negative pattern.`,
    source: 'TED',
    difficulty: 'B1',
    tags: ['Habits', 'Psychology', 'Self-improvement'],
    speaker: 'James Clear'
  },
  {
    id: 'lsn-002',
    title: 'The History of the English Language',
    audioUrl: '/audio/english-history.mp3',
    duration: 420,
    transcript: `The English language has a fascinating history that spans over 1,500 years. Its evolution reflects the cultural and political changes of the societies that spoke it.

Old English, spoken from roughly 450 to 1100 AD, was a Germanic language brought to Britain by Anglo-Saxon settlers. Words like "water," "house," and "strong" come from this period.

The Norman Conquest of 1066 introduced thousands of French words into English. This is why we have pairs like "cow" (the animal) and "beef" (the meat)—Anglo-Saxon farmers raised the animals, while French-speaking nobles ate them.

The Great Vowel Shift of the 15th century dramatically changed English pronunciation, which is why English spelling often seems inconsistent today. Shakespeare coined over 1,700 words that we still use.

Modern English continues to evolve rapidly, with new words entering the language every year through technology, culture, and global communication.`,
    source: 'BBC Learning',
    difficulty: 'B2',
    tags: ['History', 'Language', 'Culture'],
    speaker: 'Dr. Sarah Johnson'
  },
  {
    id: 'lsn-003',
    title: 'Understanding Global Economics',
    audioUrl: '/audio/economics.mp3',
    duration: 360,
    transcript: `Today we'll explore the basics of global economics and how different economies interact. Understanding these concepts helps us make sense of news headlines and personal finance decisions.

Gross Domestic Product, or GDP, measures the total value of goods and services produced by a country. It's the most common indicator of economic health. When GDP grows, the economy is expanding. When it contracts, we may be heading into a recession.

Inflation is another crucial concept. It refers to the general increase in prices over time. Moderate inflation is normal and healthy, but hyperinflation can devastate an economy. Central banks use interest rates to control inflation.

International trade benefits all participating nations through comparative advantage. Each country specializes in producing what it does most efficiently, then trades with others. This is why your smartphone contains components from dozens of different countries.

Exchange rates determine how much one currency is worth in terms of another. These rates fluctuate based on economic conditions, political stability, and market speculation.`,
    source: 'NPR',
    difficulty: 'B2',
    tags: ['Economics', 'Finance', 'Global'],
    speaker: 'Prof. Michael Chen'
  }
]

export const mockListeningQuestions: ListeningQuestion[] = [
  {
    id: 'q-001',
    materialId: 'lsn-001',
    type: 'multiple-choice',
    question: 'According to the speaker, what is the key to habit formation?',
    options: [
      'Willpower and determination',
      'Understanding the habit loop',
      'Setting big goals',
      'Having an accountability partner'
    ],
    correctAnswer: 'Understanding the habit loop',
    explanation: 'The speaker explicitly states that the key to habit formation is understanding the habit loop: cue, routine, and reward.',
    timestamp: 45
  },
  {
    id: 'q-002',
    materialId: 'lsn-001',
    type: 'fill-blank',
    question: 'To make a new habit easy, start with just ______ minutes.',
    correctAnswer: 'two',
    explanation: 'The speaker suggests starting with just two minutes to make the habit easy to begin.',
    timestamp: 120
  },
  {
    id: 'q-003',
    materialId: 'lsn-001',
    type: 'true-false',
    question: 'Missing one day of a habit breaks the chain completely.',
    correctAnswer: 'false',
    explanation: 'The speaker says missing one day doesn\'t break the chain—it\'s missing two consecutive days that starts to form a negative pattern.',
    timestamp: 250
  }
]
