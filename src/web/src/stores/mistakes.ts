import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { MistakeRecord, MistakeMasteryStatus } from '../types'
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
  // tab 值与后端 MasteryStatus 枚举一致（大写），'all' 不过滤
  const activeFilter = ref<MistakeMasteryStatus | 'all'>('all')

  // 服务端已按 activeFilter 过滤（mastery 参数）；本地再兜底一次
  const filteredMistakes = computed(() => {
    if (activeFilter.value === 'all') return mistakes.value
    return mistakes.value.filter(m => m.masteryStatus === activeFilter.value)
  })

  async function fetchList(filter?: MistakeMasteryStatus | 'all') {
    loading.value = true
    error.value = null
    try {
      const target = filter ?? activeFilter.value
      mistakes.value = await mistakesApi.getList(
        target === 'all' ? undefined : { mastery: target },
      )
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

  async function updateMastery(id: string, status: MistakeMasteryStatus) {
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

  async function setFilter(filter: MistakeMasteryStatus | 'all') {
    activeFilter.value = filter
    // 走服务端过滤，避免超过单页条数时本地筛不全
    await fetchList(filter)
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
