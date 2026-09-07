import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { PracticeQuestion, PracticeType, CEFRLevel, PracticeSession } from '../types'
import { practiceApi } from '../api/practice'

export const usePracticeStore = defineStore('practice', () => {
  const currentSession = ref<PracticeSession | null>(null)
  const questions = ref<PracticeQuestion[]>([])
  const currentIndex = ref(0)
  const selectedAnswer = ref<string | null>(null)
  const showAnswer = ref(false)
  const loading = ref(false)
  const error = ref<string | null>(null)
  // 最近一次提交的判分结果（null=尚未提交或提交失败），供页面 toast 判断对错
  const lastCorrect = ref<boolean | null>(null)
  const score = ref(0)
  const correctCount = ref(0)
  const streakCount = ref(0)
  const showResults = ref(false)

  const currentQuestion = computed(() => {
    if (questions.value.length === 0) return null
    return questions.value[currentIndex.value]
  })

  const totalQuestions = computed(() => questions.value.length)

  const progress = computed(() => {
    if (questions.value.length === 0) return 0
    return ((currentIndex.value + 1) / questions.value.length) * 100
  })

  const accuracy = computed(() => {
    if (correctCount.value === 0) return 0
    return Math.round((correctCount.value / (currentIndex.value + 1)) * 100)
  })

  async function loadQuestions(params: {
    type: PracticeType
    difficulty?: CEFRLevel
    contentId?: string
    limit?: number
  }) {
    loading.value = true
    error.value = null
    try {
      // 后端所有题目都挂在会话下，统一创建会话后取 questions
      currentSession.value = await practiceApi.createSession({
        type: params.type,
        difficulty: params.difficulty,
        contentId: params.contentId,
        questionCount: params.limit ?? 10,
      })
      questions.value = currentSession.value.questions
      currentIndex.value = 0
      selectedAnswer.value = null
      showAnswer.value = false
      showResults.value = false
      score.value = 0
      correctCount.value = 0
      streakCount.value = 0
      lastCorrect.value = null
    } catch (e) {
      error.value = e instanceof Error ? e.message : '加载练习题失败'
    } finally {
      loading.value = false
    }
  }

  async function submitAnswer(answer?: string) {
    const answerToSubmit = answer ?? selectedAnswer.value
    if (!answerToSubmit || !currentQuestion.value) return

    showAnswer.value = true
    lastCorrect.value = null

    try {
      if (currentSession.value) {
        const result = await practiceApi.submitAnswer(
          currentSession.value.id,
          currentQuestion.value.id,
          answerToSubmit,
        )
        lastCorrect.value = result.correct
        if (result.correct) {
          correctCount.value++
          score.value += result.points
          streakCount.value++
        } else {
          streakCount.value = 0
        }
      } else {
        streakCount.value = 0
      }
    } catch {
      streakCount.value = 0
    }
  }

  function nextQuestion() {
    if (currentIndex.value < questions.value.length - 1) {
      currentIndex.value++
      selectedAnswer.value = null
      showAnswer.value = false
    } else {
      finishPractice()
    }
  }

  async function finishPractice() {
    if (currentSession.value) {
      try {
        await practiceApi.completeSession(currentSession.value.id)
      } catch {
        // non-critical
      }
    }
    showResults.value = true
  }

  function selectAnswer(answer: string) {
    if (!showAnswer.value) {
      selectedAnswer.value = answer
    }
  }

  function reset() {
    currentSession.value = null
    questions.value = []
    currentIndex.value = 0
    selectedAnswer.value = null
    showAnswer.value = false
    showResults.value = false
    score.value = 0
    correctCount.value = 0
    streakCount.value = 0
    lastCorrect.value = null
    error.value = null
  }

  return {
    currentSession,
    questions,
    currentIndex,
    selectedAnswer,
    showAnswer,
    loading,
    error,
    lastCorrect,
    score,
    correctCount,
    streakCount,
    showResults,
    currentQuestion,
    totalQuestions,
    progress,
    accuracy,
    loadQuestions,
    submitAnswer,
    nextQuestion,
    finishPractice,
    selectAnswer,
    reset,
  }
})
