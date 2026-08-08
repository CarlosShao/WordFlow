import type { Vocabulary } from '../types'

export const mockVocabulary: Vocabulary[] = [
  {
    id: 'voc-001',
    word: 'ubiquitous',
    phonetic: '/juːˈbɪkwɪtəs/',
    partOfSpeech: 'adjective',
    definition: 'Present, appearing, or found everywhere.',
    chineseDefinition: '无处不在的，普遍存在的',
    examples: [
      {
        id: 'ex-001',
        english: 'Smartphones have become ubiquitous in modern society.',
        chinese: '智能手机在现代社会已经无处不在。',
        source: 'BBC',
        highlight: 'ubiquitous'
      },
      {
        id: 'ex-002',
        english: 'The ubiquitous influence of social media affects our daily lives.',
        chinese: '社交媒体无处不在的影响着我们的日常生活。',
        source: 'CNN',
        highlight: 'ubiquitous'
      }
    ],
    wordFamily: [
      { word: 'ubiquitously', partOfSpeech: 'adverb', definition: '到处，普遍地' },
      { word: 'ubiquity', partOfSpeech: 'noun', definition: '无处不在，普遍存在' }
    ],
    etymology: 'From Latin ubique meaning "everywhere"',
    frequency: 4,
    masteryLevel: 65,
    addedAt: '2024-01-10',
    lastReviewedAt: '2024-01-20',
    nextReviewAt: '2024-01-27',
    source: 'BBC',
    tags: ['academic', 'B2']
  },
  {
    id: 'voc-002',
    word: 'resilient',
    phonetic: '/rɪˈzɪliənt/',
    partOfSpeech: 'adjective',
    definition: 'Able to withstand or recover quickly from difficult conditions.',
    chineseDefinition: '有弹性的，能恢复的，适应力强的',
    examples: [
      {
        id: 'ex-003',
        english: 'Children are remarkably resilient and can adapt to change quickly.',
        chinese: '孩子们有着惊人的适应力，能快速适应变化。',
        source: 'Medium',
        highlight: 'resilient'
      }
    ],
    wordFamily: [
      { word: 'resilience', partOfSpeech: 'noun', definition: '恢复力，适应力' },
      { word: 'resiliently', partOfSpeech: 'adverb', definition: '有恢复力地' }
    ],
    etymology: 'From Latin resilire meaning "to rebound"',
    frequency: 5,
    masteryLevel: 80,
    addedAt: '2024-01-12',
    lastReviewedAt: '2024-01-22',
    nextReviewAt: '2024-01-29',
    source: 'TED',
    tags: ['psychology', 'B1']
  },
  {
    id: 'voc-003',
    word: 'paradigm',
    phonetic: '/ˈpærədaɪm/',
    partOfSpeech: 'noun',
    definition: 'A typical example or pattern of something; a model or framework.',
    chineseDefinition: '范例，典范，模式',
    examples: [
      {
        id: 'ex-004',
        english: 'The discovery represented a paradigm shift in scientific thinking.',
        chinese: '这一发现代表了科学思维的范式转变。',
        source: 'NYT',
        highlight: 'paradigm'
      }
    ],
    wordFamily: [
      { word: 'paradigmatic', partOfSpeech: 'adjective', definition: '典范的，范式的' }
    ],
    etymology: 'From Greek paradeigma meaning "pattern"',
    frequency: 3,
    masteryLevel: 45,
    addedAt: '2024-01-15',
    lastReviewedAt: '2024-01-25',
    nextReviewAt: '2024-02-01',
    source: 'NYT',
    tags: ['academic', 'C1']
  },
  {
    id: 'voc-004',
    word: 'ephemeral',
    phonetic: '/ɪˈfemərəl/',
    partOfSpeech: 'adjective',
    definition: 'Lasting for a very short time.',
    chineseDefinition: '短暂的，瞬息即逝的',
    examples: [
      {
        id: 'ex-005',
        english: 'Social media posts are ephemeral—here today, forgotten tomorrow.',
        chinese: '社交媒体帖子是短暂的——今天发布，明天就被遗忘。',
        source: 'Reddit',
        highlight: 'ephemeral'
      }
    ],
    wordFamily: [
      { word: 'ephemerally', partOfSpeech: 'adverb', definition: '短暂地' },
      { word: 'ephemeron', partOfSpeech: 'noun', definition: '短命之物' }
    ],
    etymology: 'Greek ephēmeros meaning "lasting only a day"',
    frequency: 2,
    masteryLevel: 30,
    addedAt: '2024-01-18',
    source: 'Medium',
    tags: ['literary', 'C1']
  },
  {
    id: 'voc-005',
    word: 'pragmatic',
    phonetic: '/præɡˈmætɪk/',
    partOfSpeech: 'adjective',
    definition: 'Dealing with things sensibly and realistically.',
    chineseDefinition: '务实的，实用主义的',
    examples: [
      {
        id: 'ex-006',
        english: 'We need a pragmatic approach to solve this problem.',
        chinese: '我们需要一种务实的方法来解决这个问题。',
        source: 'BBC',
        highlight: 'pragmatic'
      }
    ],
    wordFamily: [
      { word: 'pragmatically', partOfSpeech: 'adverb', definition: '务实地' },
      { word: 'pragmatism', partOfSpeech: 'noun', definition: '实用主义' },
      { word: 'pragmatist', partOfSpeech: 'noun', definition: '实用主义者' }
    ],
    etymology: 'Greek pragmatikos meaning "relating to fact"',
    frequency: 4,
    masteryLevel: 70,
    addedAt: '2024-01-20',
    lastReviewedAt: '2024-01-28',
    nextReviewAt: '2024-02-04',
    source: 'CNN',
    tags: ['business', 'B2']
  }
]
