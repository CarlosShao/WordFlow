import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { ContentItem, ContentType, ContentCategory, CEFRLevel, Article, ArticleSource, ListeningMaterial } from '../types'
import { contentApi } from '../api/content'
import { articlesApi } from '../api/articles'
import { listeningApi } from '../api/listening'

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
  const articles = ref<Article[]>([])
  const listeningMaterials = ref<ListeningMaterial[]>([])

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
      const resItems = res?.items ?? []
      if (params?.append) {
        items.value = [...items.value, ...resItems]
      } else {
        items.value = resItems
      }
      total.value = res?.total ?? resItems.length
      currentPage.value = res?.page ?? currentPage.value
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

  async function fetchArticles(params?: {
    difficulty?: CEFRLevel
    source?: ArticleSource
  }) {
    loading.value = true
    error.value = null
    try {
      const result = await articlesApi.getList({
        difficulty: params?.difficulty,
        source: params?.source,
      })
      articles.value = result.articles
    } catch (e) {
      error.value = e instanceof Error ? e.message : '加载文章失败'
    } finally {
      loading.value = false
    }
  }

  async function fetchListeningMaterials(params?: {
    difficulty?: CEFRLevel
  }) {
    loading.value = true
    error.value = null
    try {
      listeningMaterials.value = await listeningApi.getList({
        difficulty: params?.difficulty,
      })
    } catch (e) {
      error.value = e instanceof Error ? e.message : '加载听力素材失败'
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
    articles.value = []
    listeningMaterials.value = []
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
    articles,
    listeningMaterials,
    hasMore,
    fetchList,
    fetchById,
    fetchArticles,
    fetchListeningMaterials,
    fetchRecommendations,
    favorite,
    unfavorite,
    reset,
  }
})
