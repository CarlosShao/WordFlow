import type { DashboardStats, HeatmapData, ChartDataPoint } from '../types'

export const mockDashboardStats: DashboardStats = {
  todayStudyMinutes: 45,
  todayWordsLearned: 12,
  streak: 7,
  weeklyGoalProgress: 75,
  totalWords: 1250,
  totalArticles: 48,
  totalListeningHours: 24
}

export const mockHeatmapData: HeatmapData[] = Array.from({ length: 365 }, (_, i) => {
  const date = new Date()
  date.setDate(date.getDate() - (364 - i))
  return {
    date: date.toISOString().split('T')[0],
    count: Math.random() > 0.3 ? Math.floor(Math.random() * 5) + 1 : 0
  }
})

export const mockWordGrowthData: ChartDataPoint[] = [
  { label: '1月', value: 120 },
  { label: '2月', value: 280 },
  { label: '3月', value: 450 },
  { label: '4月', value: 620 },
  { label: '5月', value: 780 },
  { label: '6月', value: 950 },
  { label: '7月', value: 1100 },
  { label: '8月', value: 1250 }
]

export const mockWeeklyStudyData: ChartDataPoint[] = [
  { label: '周一', value: 35 },
  { label: '周二', value: 52 },
  { label: '周三', value: 28 },
  { label: '周四', value: 65 },
  { label: '周五', value: 45 },
  { label: '周六', value: 78 },
  { label: '周日', value: 60 }
]

export const mockTodayRecommendations = {
  article: {
    id: 'art-001',
    title: 'The Future of AI in Everyday Life',
    source: 'BBC',
    difficulty: 'B2' as const,
    estimatedMinutes: 8
  },
  listening: {
    id: 'lsn-001',
    title: 'How to Build Better Habits',
    source: 'TED',
    duration: 300,
    difficulty: 'B1' as const
  },
  wordsToReview: 15
}
