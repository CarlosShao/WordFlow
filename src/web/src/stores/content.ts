import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ContentItem, ContentType, ContentCategory, CEFRLevel } from '../types'
import { contentApi } from '../api/content'

export const useContentStore = defineStore('content', () => {
  const items = ref<ContentItem[]>([])
  const currentContent = ref<ContentItem | null>(null)
  const recommendations = ref<ContentItem[]>([])
  const favorites = ref<ContentItem[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const total = ref(0)
  const currentPage = ref(1)
  const pageSize = ref(12)

  const hasMore = computed(() => items.value.length < total.value)

  async function fetchList(params?: {
    page?: number
    pageSize?: number
    type?: ContentType
    category?: ContentCategory
    difficulty?: CEFRLevel
    search?: string
    append?: boolean
  }) {
    loading.value = true
    error.value = null
    try {
      const page = params?.page ?? currentPage.value
      const size = params?.pageSize ?? pageSize.value
      const res = await contentApi.getList({
        page,
        pageSize: size,
        type: params?.type,
        category: params?.category,
        difficulty: params?.difficulty,
        search: params?.search,
      })
      if (params?.append) {
        items.value = [...items.value, ...res.items]
      } else {
        items.value = res.items
      }
      total.value = res.total
      currentPage.value = res.page
    } catch (e) {
      error.value = e instanceof Error ? e.message : '加载内容失败'
    } finally {
      loading.value = false
    }
  }

  async function fetchById(id: string) {
    loading.value = true
    error.value = null
    try {
      currentContent.value = await contentApi.getById(id)
    } catch (e) {
      error.value = e instanceof Error ? e.message : '加载内容详情失败'
      currentContent.value = null
    } finally {
      loading.value = false
    }
  }

  async function fetchRecommendations(limit: number = 3) {
    try {
      recommendations.value = await contentApi.getRecommendations(limit)
    } catch {
      // non-critical
    }
  }

  async function favorite(id: string) {
    try {
      await contentApi.favorite(id)
      const item = items.value.find(i => i.id === id)
      if (item) favorites.value.push(item)
    } catch {
      // handle error
    }
  }

  async function unfavorite(id: string) {
    try {
      await contentApi.unfavorite(id)
      favorites.value = favorites.value.filter(i => i.id !== id)
    } catch {
      // handle error
    }
  }

  function reset() {
    items.value = []
    currentContent.value = null
    recommendations.value = []
    total.value = 0
    currentPage.value = 1
    error.value = null
  }

  return {
    items,
    currentContent,
    recommendations,
    favorites,
    loading,
    error,
    total,
    currentPage,
    pageSize,
    hasMore,
    fetchList,
    fetchById,
    fetchRecommendations,
    favorite,
    unfavorite,
    reset,
  }
})
