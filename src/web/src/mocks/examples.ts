import type { ExampleSearchResult } from '../types'

export const mockExamples: ExampleSearchResult[] = [
  {
    id: 'ex-001',
    sentence: 'The new policy has had a significant impact on the economy.',
    translation: '新政策对经济产生了重大影响。',
    source: 'BBC News',
    sourceUrl: 'https://bbc.com/news',
    difficulty: 'B1',
    wordHighlight: 'significant'
  },
  {
    id: 'ex-002',
    sentence: 'She managed to accomplish her goals despite facing numerous obstacles.',
    translation: '尽管面临重重障碍，她还是成功实现了自己的目标。',
    source: 'CNN',
    sourceUrl: 'https://cnn.com',
    difficulty: 'B2',
    wordHighlight: 'accomplish'
  },
  {
    id: 'ex-003',
    sentence: 'The researchers conducted a comprehensive study on climate change.',
    translation: '研究人员对气候变化进行了一项全面的研究。',
    source: 'Nature',
    sourceUrl: 'https://nature.com',
    difficulty: 'C1',
    wordHighlight: 'comprehensive'
  },
  {
    id: 'ex-004',
    sentence: 'Technology has fundamentally transformed how we communicate.',
    translation: '技术从根本上改变了我们的沟通方式。',
    source: 'TED Talk',
    sourceUrl: 'https://ted.com',
    difficulty: 'B2',
    wordHighlight: 'fundamentally'
  },
  {
    id: 'ex-005',
    sentence: 'The government aims to implement the new regulations by next year.',
    translation: '政府计划在明年之前实施新的法规。',
    source: 'NYT',
    sourceUrl: 'https://nytimes.com',
    difficulty: 'B2',
    wordHighlight: 'implement'
  },
  {
    id: 'ex-006',
    sentence: 'Many people underestimate the importance of regular exercise.',
    translation: '许多人低估了定期锻炼的重要性。',
    source: 'Reddit',
    sourceUrl: 'https://reddit.com',
    difficulty: 'B1',
    wordHighlight: 'underestimate'
  },
  {
    id: 'ex-007',
    sentence: 'The company decided to allocate more resources to research and development.',
    translation: '公司决定分配更多资源用于研发。',
    source: 'Bloomberg',
    sourceUrl: 'https://bloomberg.com',
    difficulty: 'C1',
    wordHighlight: 'allocate'
  },
  {
    id: 'ex-008',
    sentence: 'Learning a language requires patience and consistent effort.',
    translation: '学习一门语言需要耐心和持续的努力。',
    source: 'Medium',
    sourceUrl: 'https://medium.com',
    difficulty: 'A2',
    wordHighlight: 'consistent'
  }
]
