import client from './client'
import type { DashboardStats, HeatmapData, ChartDataPoint, ContentItem } from '../types'

export const dashboardApi = {
  async getStats(): Promise<DashboardStats> {
    const data = await client.get('/api/v1/dashboard/stats')
    return data as unknown as DashboardStats
  },

  async getHeatmapData(): Promise<HeatmapData[]> {
    const data = await client.get('/api/v1/dashboard/heatmap')
    return data as unknown as HeatmapData[]
  },

  async getWordGrowthData(): Promise<ChartDataPoint[]> {
    const data = await client.get('/api/v1/dashboard/word-growth')
    return data as unknown as ChartDataPoint[]
  },

  async getWeeklyStudyData(): Promise<ChartDataPoint[]> {
    const data = await client.get('/api/v1/dashboard/weekly-study')
    return data as unknown as ChartDataPoint[]
  },

  async getTodayRecommendations(): Promise<ContentItem[]> {
    const data = await client.get('/api/v1/dashboard/recommendations')
    return data as unknown as ContentItem[]
  },

  async getStreak(): Promise<{ current: number; longest: number }> {
    const data = await client.get('/api/v1/dashboard/streak')
    return data as unknown as { current: number; longest: number }
  },
}
