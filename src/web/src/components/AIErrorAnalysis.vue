<template>
  <div class="ai-error-analysis">
    <!-- Loading state -->
    <div v-if="isLoading" class="loading-block">
      <LoadingSpinner />
      <span class="loading-text">AI 正在分析错误...</span>
    </div>

    <!-- Analysis result -->
    <div v-if="analysis && !isLoading" class="analysis-content">
      <!-- Error pattern -->
      <div class="analysis-section">
        <div class="section-header">
          <svg class="section-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span class="section-label">错误模式</span>
        </div>
        <p class="section-value error-pattern">{{ analysis.errorPattern }}</p>
      </div>

      <!-- Explanation -->
      <div class="analysis-section">
        <div class="section-header">
          <svg class="section-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <span class="section-label">错误分析</span>
        </div>
        <p class="section-value">{{ analysis.explanation }}</p>
      </div>

      <!-- Grammar/Vocabulary concept -->
      <div class="analysis-section">
        <div class="section-header">
          <svg class="section-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          </svg>
          <span class="section-label">相关知识点</span>
        </div>
        <p class="section-value concept-text">{{ analysis.concept }}</p>
      </div>

      <!-- Study recommendation -->
      <div class="analysis-section recommendation">
        <div class="section-header">
          <svg class="section-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
          <span class="section-label">学习建议</span>
        </div>
        <p class="section-value">{{ analysis.studyRecommendation }}</p>
      </div>

      <!-- Similar questions -->
      <div v-if="analysis.similarQuestions?.length" class="similar-section">
        <div class="section-header">
          <svg class="section-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="8" y1="6" x2="21" y2="6" />
            <line x1="8" y1="12" x2="21" y2="12" />
            <line x1="8" y1="18" x2="21" y2="18" />
            <line x1="3" y1="6" x2="3.01" y2="6" />
            <line x1="3" y1="12" x2="3.01" y2="12" />
            <line x1="3" y1="18" x2="3.01" y2="18" />
          </svg>
          <span class="section-label">相似练习</span>
        </div>

        <div v-for="(sq, idx) in analysis.similarQuestions" :key="idx" class="similar-question">
          <p class="similar-question-text">{{ sq.question }}</p>
          <div v-if="sq.options" class="similar-options">
            <button
              v-for="(opt, oi) in sq.options"
              :key="oi"
              :class="['similar-option', {
                selected: similarAnswers[idx] === opt,
                correct: showSimilarResults[idx] && opt === sq.answer,
                wrong: showSimilarResults[idx] && similarAnswers[idx] === opt && opt !== sq.answer
              }]"
              :disabled="showSimilarResults[idx]"
              @click="selectSimilarAnswer(idx, opt)"
            >
              {{ opt }}
            </button>
          </div>
          <div v-if="showSimilarResults[idx]" class="similar-result">
            <span v-if="similarAnswers[idx] === sq.answer" class="result-correct">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              正确
            </span>
            <span v-else class="result-wrong">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
              正确答案：{{ sq.answer }}
            </span>
          </div>
          <div v-if="!showSimilarResults[idx]" class="similar-actions">
            <BaseButton
              variant="secondary"
              size="sm"
              :disabled="!similarAnswers[idx]"
              @click="checkSimilarAnswer(idx)"
            >
              检查
            </BaseButton>
          </div>
        </div>
      </div>

      <!-- Practice more button -->
      <div class="practice-more">
        <BaseButton variant="primary" size="md" @click="$emit('practice-more')">
          再练几题
        </BaseButton>
      </div>
    </div>

    <!-- Error state -->
    <div v-if="error && !isLoading" class="error-block">
      <span class="error-text">{{ error }}</span>
      <BaseButton variant="ghost" size="sm" @click="analyze">重试</BaseButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import BaseButton from './BaseButton.vue'
import LoadingSpinner from './LoadingSpinner.vue'
import { aiService } from '../services/aiService'
import type { PracticeQuestion } from '../types'

interface Props {
  question: PracticeQuestion
  userAnswer: string
}

const props = defineProps<Props>()

defineEmits<{
  'practice-more': []
}>()

const isLoading = ref(false)
const error = ref('')
const analysis = ref<{
  errorPattern: string
  explanation: string
  concept: string
  studyRecommendation: string
  similarQuestions: Array<{
    question: string
    options?: string[]
    answer: string
  }>
} | null>(null)

const similarAnswers = reactive<Record<number, string>>({})
const showSimilarResults = reactive<Record<number, boolean>>({})

onMounted(() => {
  analyze()
})

async function analyze() {
  isLoading.value = true
  error.value = ''
  analysis.value = null

  const correctAnswer = Array.isArray(props.question.correctAnswer)
    ? props.question.correctAnswer.join(', ')
    : props.question.correctAnswer

  try {
    analysis.value = await aiService.analyzeError({
      question: props.question.question,
      userAnswer: props.userAnswer,
      correctAnswer,
    })
  } catch (e) {
    error.value = e instanceof Error ? e.message : '分析失败，请重试'
  }

  isLoading.value = false
}

function selectSimilarAnswer(idx: number, option: string) {
  similarAnswers[idx] = option
}

function checkSimilarAnswer(idx: number) {
  if (!similarAnswers[idx]) return
  showSimilarResults[idx] = true
}
</script>

<style scoped>
.ai-error-analysis {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
}

/* Loading */
.loading-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
  padding: var(--space-10) var(--space-4);
}

.loading-text {
  font-size: 0.875rem;
  color: var(--color-text-muted);
}

/* Analysis content */
.analysis-content {
  display: flex;
  flex-direction: column;
}

.analysis-section {
  padding: var(--space-4);
  border-bottom: 1px solid var(--color-border);
}

.analysis-section:last-of-type {
  border-bottom: none;
}

.section-header {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-2);
}

.section-icon {
  color: var(--color-text-muted);
  flex-shrink: 0;
}

.section-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.section-value {
  font-size: 0.875rem;
  color: var(--color-text);
  line-height: 1.6;
  margin: 0;
}

.error-pattern {
  font-weight: 600;
  color: var(--color-danger-600);
}

.concept-text {
  background: var(--color-surface-muted);
  padding: var(--space-3);
  border-radius: var(--radius-sm);
  font-size: 0.8125rem;
}

.recommendation {
  background: var(--color-surface-muted);
}

/* Similar questions */
.similar-section {
  padding: var(--space-4);
  border-top: 1px solid var(--color-border);
}

.similar-question {
  margin-top: var(--space-3);
  padding: var(--space-3);
  background: var(--color-surface-muted);
  border-radius: var(--radius-sm);
}

.similar-question-text {
  font-size: 0.875rem;
  color: var(--color-text);
  line-height: 1.5;
  margin: 0 0 var(--space-3);
}

.similar-options {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.similar-option {
  display: flex;
  align-items: center;
  padding: var(--space-2) var(--space-3);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-size: 0.8125rem;
  color: var(--color-text);
  cursor: pointer;
  transition: all 0.16s ease;
}

.similar-option:hover:not(:disabled) {
  border-color: var(--color-border-strong);
  background: var(--color-surface-muted);
}

.similar-option.selected {
  border-color: var(--color-primary);
  background: var(--color-surface-muted);
}

.similar-option.correct {
  border-color: var(--color-success-600);
  background: var(--color-success-50);
}

.similar-option.wrong {
  border-color: var(--color-danger-600);
  background: var(--color-danger-50);
}

.similar-option:disabled {
  cursor: default;
}

.similar-result {
  margin-top: var(--space-2);
  font-size: 0.8125rem;
  font-weight: 600;
}

.result-correct {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  color: var(--color-success-600);
}

.result-wrong {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  color: var(--color-danger-600);
}

.similar-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: var(--space-2);
}

/* Practice more */
.practice-more {
  padding: var(--space-4);
  display: flex;
  justify-content: center;
  border-top: 1px solid var(--color-border);
}

/* Error */
.error-block {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-6);
}

.error-text {
  font-size: 0.875rem;
  color: var(--color-danger-600);
}
</style>
