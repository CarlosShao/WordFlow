import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { DashboardStats, HeatmapData, ChartDataPoint, ContentItem } from '../types'
import { dashboardApi } from '../api/dashboard'

export const useDashboardStore = defineStore('dashboard', () => {
  const stats = ref<DashboardStats>({
    todayStudyMinutes: 0,
    todayWordsLearned: 0,
    streak: 0,
    weeklyGoalProgress: 0,
    totalWords: 0,
    totalArticles: 0,
    totalListeningHours: 0,
  })
  const heatmapData = ref<HeatmapData[]>([])
  const wordGrowthData = ref<ChartDataPoint[]>([])
  const weeklyStudyData = ref<ChartDataPoint[]>([])
  const todayRecommendations = ref<ContentItem[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchStats() {
    try {
      stats.value = await dashboardApi.getStats()
    } catch (e) {
      error.value = e instanceof Error ? e.message : '加载统计数据失败'
    }
  }

  async function fetchHeatmap() {
    try {
      heatmapData.value = await dashboardApi.getHeatmapData()
    } catch {
      // non-critical
    }
  }

  async function fetchWordGrowth() {
    try {
      wordGrowthData.value = await dashboardApi.getWordGrowthData()
    } catch {
      // non-critical
    }
  }

  async function fetchWeeklyStudy() {
    try {
      weeklyStudyData.value = await dashboardApi.getWeeklyStudyData()
    } catch {
      // non-critical
    }
  }

  async function fetchRecommendations() {
    try {
      todayRecommendations.value = await dashboardApi.getTodayRecommendations()
    } catch {
      // non-critical
    }
  }

  async function fetchAll() {
    loading.value = true
    error.value = null
    try {
      await Promise.all([
        fetchStats(),
        fetchHeatmap(),
        fetchWordGrowth(),
        fetchWeeklyStudy(),
        fetchRecommendations(),
      ])
    } finally {
      loading.value = false
    }
  }

  function reset() {
    stats.value = {
      todayStudyMinutes: 0,
      todayWordsLearned: 0,
      streak: 0,
      weeklyGoalProgress: 0,
      totalWords: 0,
      totalArticles: 0,
      totalListeningHours: 0,
    }
    heatmapData.value = []
    wordGrowthData.value = []
    weeklyStudyData.value = []
    todayRecommendations.value = []
    error.value = null
  }

  return {
    stats,
    heatmapData,
    wordGrowthData,
    weeklyStudyData,
    todayRecommendations,
    loading,
    error,
    fetchStats,
    fetchHeatmap,
    fetchWordGrowth,
    fetchWeeklyStudy,
    fetchRecommendations,
    fetchAll,
    reset,
  }
})
