import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { MistakeRecord, PracticeType } from '../types'
import { mistakesApi, type MistakeStats } from '../api/mistakes'

export const useMistakesStore = defineStore('mistakes', () => {
  const mistakes = ref<MistakeRecord[]>([])
  const stats = ref<MistakeStats>({
    total: 0,
    notReviewed: 0,
    reviewing: 0,
    mastered: 0,
  })
  const loading = ref(false)
  const error = ref<string | null>(null)
  const activeFilter = ref<string>('all')

  const filteredMistakes = computed(() => {
    if (activeFilter.value === 'all') return mistakes.value
    return mistakes.value.filter(m => m.masteryStatus === activeFilter.value)
  })

  async function fetchList(params?: {
    masteryStatus?: 'not-reviewed' | 'reviewing' | 'mastered'
    type?: PracticeType
  }) {
    loading.value = true
    error.value = null
    try {
      mistakes.value = await mistakesApi.getList(params)
    } catch (e) {
      error.value = e instanceof Error ? e.message : '加载错题失败'
    } finally {
      loading.value = false
    }
  }

  async function fetchStats() {
    try {
      stats.value = await mistakesApi.getStats()
    } catch {
      // non-critical
    }
  }

  async function updateMastery(id: string, status: 'not-reviewed' | 'reviewing' | 'mastered') {
    try {
      const updated = await mistakesApi.updateMastery(id, status)
      const index = mistakes.value.findIndex(m => m.id === id)
      if (index !== -1) {
        mistakes.value[index] = updated
      }
      await fetchStats()
      return { success: true }
    } catch (e) {
      const msg = e instanceof Error ? e.message : '更新失败'
      error.value = msg
      return { success: false, error: msg }
    }
  }

  async function deleteMistake(id: string) {
    try {
      await mistakesApi.delete(id)
      mistakes.value = mistakes.value.filter(m => m.id !== id)
      await fetchStats()
    } catch {
      // handle error
    }
  }

  function setFilter(filter: string) {
    activeFilter.value = filter
  }

  function reset() {
    mistakes.value = []
    stats.value = { total: 0, notReviewed: 0, reviewing: 0, mastered: 0 }
    activeFilter.value = 'all'
    error.value = null
  }

  return {
    mistakes,
    stats,
    loading,
    error,
    activeFilter,
    filteredMistakes,
    fetchList,
    fetchStats,
    updateMastery,
    deleteMistake,
    setFilter,
    reset,
  }
})
