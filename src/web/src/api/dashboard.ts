import client from './client'
import type { DashboardStats, HeatmapData, ChartDataPoint, ContentItem } from '../types'
import { contentApi } from './content'

export const dashboardApi = {
  // 今日概览（后端：GET /api/v1/dashboard/overview）
  async getStats(): Promise<DashboardStats> {
    const data = await client.get('/api/v1/dashboard/overview')
    const d = (data as unknown as {
      vocabulary?: { total: number; mastered: number; due: number }
      today?: { practiceSessions: number; correctAnswers: number }
      mistakes?: number
    })
    return {
      todayStudyMinutes: 0,
      todayWordsLearned: d.today?.correctAnswers ?? 0,
      streak: 0,
      weeklyGoalProgress: 0,
      totalWords: d.vocabulary?.total ?? 0,
      totalArticles: d.vocabulary?.due ?? 0,
      totalListeningHours: 0,
    }
  },

  async getHeatmapData(): Promise<HeatmapData[]> {
    const data = await client.get('/api/v1/dashboard/heatmap')
    return (data as unknown as HeatmapData[]) ?? []
  },

  // 词汇增长（后端：GET /api/v1/dashboard/vocab-growth）
  async getWordGrowthData(): Promise<ChartDataPoint[]> {
    const data = await client.get('/api/v1/dashboard/vocab-growth')
    const list = (data as unknown as Array<{ date: string; count: number; total: number }>) ?? []
    // Format date to short label (MM-DD) and sample to max 12 points
    const formatted = list.map((p) => {
      const d = new Date(p.date)
      const label = `${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`
      return { label, value: p.total }
    })
    // Sample: if too many points, take evenly spaced ones (max 12)
    if (formatted.length > 12) {
      const step = Math.ceil(formatted.length / 12)
      return formatted.filter((_, i) => i % step === 0).slice(0, 12)
    }
    return formatted
  },

  // 近 7 天学习数据：后端无 weekly-study 路由，从 heatmap 派生近 7 天
  async getWeeklyStudyData(): Promise<ChartDataPoint[]> {
    const heatmap = await this.getHeatmapData()
    const last7 = heatmap.slice(-7)
    return last7.map((p) => ({ label: p.date, value: p.count }))
  },

  // 今日推荐：后端无 recommendations 路由，复用内容推荐
  async getTodayRecommendations(): Promise<ContentItem[]> {
    return contentApi.getRecommendations(3)
  },

  // 连续天数（后端：GET /api/v1/dashboard/streak，返回 {currentStreak, longestStreak}）
  async getStreak(): Promise<{ current: number; longest: number }> {
    const data = await client.get('/api/v1/dashboard/streak')
    const d = (data as unknown as { currentStreak?: number; longestStreak?: number }) ?? {}
    return { current: d.currentStreak ?? 0, longest: d.longestStreak ?? 0 }
  },
}
