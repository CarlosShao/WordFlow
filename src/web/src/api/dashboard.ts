import type { ApiResponse, DashboardStats, HeatmapData, ChartDataPoint } from '../types'
import { mockDashboardStats, mockHeatmapData, mockWordGrowthData, mockWeeklyStudyData, mockTodayRecommendations } from '../mocks'

// Simulate network delay
const delay = (ms: number = 300) => new Promise(resolve => setTimeout(resolve, ms))

export const dashboardApi = {
  async getStats(): Promise<ApiResponse<DashboardStats>> {
    await delay()
    return {
      success: true,
      data: mockDashboardStats
    }
  },

  async getHeatmapData(): Promise<ApiResponse<HeatmapData[]>> {
    await delay(500)
    return {
      success: true,
      data: mockHeatmapData
    }
  },

  async getWordGrowthData(): Promise<ApiResponse<ChartDataPoint[]>> {
    await delay()
    return {
      success: true,
      data: mockWordGrowthData
    }
  },

  async getWeeklyStudyData(): Promise<ApiResponse<ChartDataPoint[]>> {
    await delay()
    return {
      success: true,
      data: mockWeeklyStudyData
    }
  },

  async getTodayRecommendations(): Promise<ApiResponse<typeof mockTodayRecommendations>> {
    await delay()
    return {
      success: true,
      data: mockTodayRecommendations
    }
  }
}
