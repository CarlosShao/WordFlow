import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Vocabulary, CEFRLevel } from '../types'
import { vocabularyApi } from '../api/vocabulary'

export const useVocabularyStore = defineStore('vocabulary', () => {
  const words = ref<Vocabulary[]>([])
  const reviewList = ref<Vocabulary[]>([])
  const currentWord = ref<Vocabulary | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const total = ref(0)
  const currentPage = ref(1)
  const pageSize = ref(20)
  const searchQuery = ref('')
  const sortBy = ref<'word' | 'addedAt' | 'masteryLevel' | 'nextReviewAt'>('addedAt')
  const sortOrder = ref<'asc' | 'desc'>('desc')

  const filteredWords = computed(() => {
    if (!searchQuery.value) return words.value
    const query = searchQuery.value.toLowerCase()
    return words.value.filter(w =>
      w.word.toLowerCase().includes(query) ||
      w.chineseDefinition.includes(searchQuery.value)
    )
  })

  const reviewCount = computed(() => reviewList.value.length)

  async function fetchList(params?: {
    page?: number
    pageSize?: number
    difficulty?: CEFRLevel
    tags?: string[]
    sortBy?: 'word' | 'addedAt' | 'masteryLevel' | 'nextReviewAt'
    sortOrder?: 'asc' | 'desc'
  }) {
    loading.value = true
    error.value = null
    try {
      const res = await vocabularyApi.getList({
        page: params?.page ?? currentPage.value,
        pageSize: params?.pageSize ?? pageSize.value,
        difficulty: params?.difficulty,
        tags: params?.tags,
        sortBy: params?.sortBy ?? sortBy.value,
        sortOrder: params?.sortOrder ?? sortOrder.value,
      })
      words.value = res.items
      total.value = res.total
      currentPage.value = res.page
    } catch (e) {
      error.value = e instanceof Error ? e.message : '加载词汇失败'
    } finally {
      loading.value = false
    }
  }

  async function fetchReviewList() {
    try {
      reviewList.value = await vocabularyApi.getReviewList()
    } catch {
      // non-critical
    }
  }

  async function fetchById(id: string) {
    loading.value = true
    error.value = null
    try {
      currentWord.value = await vocabularyApi.getById(id)
    } catch (e) {
      error.value = e instanceof Error ? e.message : '加载词汇详情失败'
    } finally {
      loading.value = false
    }
  }

  async function search(keyword: string) {
    if (!keyword.trim()) {
      await fetchList()
      return
    }
    loading.value = true
    error.value = null
    try {
      const results = await vocabularyApi.search(keyword)
      words.value = results
      total.value = results.length
    } catch (e) {
      error.value = e instanceof Error ? e.message : '搜索失败'
    } finally {
      loading.value = false
    }
  }

  async function addWord(word: string, contentId?: string) {
    try {
      const vocab = await vocabularyApi.addWord(word, contentId)
      words.value.unshift(vocab)
      total.value++
      return { success: true }
    } catch (e) {
      const msg = e instanceof Error ? e.message : '添加失败'
      error.value = msg
      return { success: false, error: msg }
    }
  }

  async function review(id: string, quality: number) {
    try {
      const result = await vocabularyApi.review(id, quality)
      // Update local word data
      const index = words.value.findIndex(w => w.id === id)
      if (index !== -1) {
        words.value[index] = { ...words.value[index], masteryLevel: result.masteryLevel, nextReviewAt: result.nextReviewAt }
      }
      // Remove from review list if mastered
      reviewList.value = reviewList.value.filter(w => w.id !== id)
      return result
    } catch {
      // handle error
    }
  }

  async function deleteWord(id: string) {
    try {
      await vocabularyApi.delete(id)
      words.value = words.value.filter(w => w.id !== id)
      reviewList.value = reviewList.value.filter(w => w.id !== id)
      total.value = Math.max(0, total.value - 1)
    } catch {
      // handle error
    }
  }

  function reset() {
    words.value = []
    reviewList.value = []
    currentWord.value = null
    total.value = 0
    currentPage.value = 1
    error.value = null
    searchQuery.value = ''
  }

  return {
    words,
    reviewList,
    currentWord,
    loading,
    error,
    total,
    currentPage,
    pageSize,
    searchQuery,
    sortBy,
    sortOrder,
    filteredWords,
    reviewCount,
    fetchList,
    fetchReviewList,
    fetchById,
    search,
    addWord,
    review,
    deleteWord,
    reset,
  }
})
