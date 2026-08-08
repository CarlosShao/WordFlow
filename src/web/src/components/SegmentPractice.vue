<template>
  <div class="segment-practice">
    <div class="practice-header" @click="toggleExpand">
      <div class="practice-title-row">
        <svg class="practice-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10" />
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        <span class="practice-label">段落练习</span>
        <span class="practice-count">{{ questions.length }} 题</span>
      </div>
      <svg
        :class="['expand-icon', { expanded: isExpanded }]"
        width="16" height="16"
        viewBox="0 0 24 24"
        fill="none" stroke="currentColor" stroke-width="2"
      >
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </div>

    <Transition name="expand">
      <div v-show="isExpanded" class="practice-body">
        <div v-for="(question, qi) in questions" :key="question.id" class="question-block">
          <div class="question-header">
            <span class="question-number">{{ qi + 1 }}</span>
            <BaseTag :variant="getDifficultyVariant(question.difficulty)" size="sm">
              {{ question.difficulty }}
            </BaseTag>
            <span class="question-type">{{ getQuestionTypeLabel(question.type) }}</span>
          </div>

          <p class="question-text">{{ question.question }}</p>

          <!-- Multiple choice -->
          <div v-if="question.type === 'multiple-choice' && question.options" class="options-list">
            <button
              v-for="(option, oi) in question.options"
              :key="oi"
              :class="['option-btn', {
                selected: userAnswers[question.id] === option,
                correct: showResults[question.id] && option === question.correctAnswer,
                wrong: showResults[question.id] && userAnswers[question.id] === option && option !== question.correctAnswer
              }]"
              :disabled="showResults[question.id]"
              @click="selectOption(question.id, option)"
            >
              <span class="option-letter">{{ String.fromCharCode(65 + oi) }}</span>
              <span class="option-text">{{ option }}</span>
            </button>
          </div>

          <!-- Cloze / Fill-blank -->
          <div v-else-if="question.type === 'cloze' || question.type === 'fill-blank'" class="cloze-input">
            <input
              v-model="userAnswers[question.id]"
              type="text"
              class="input-field"
              placeholder="输入答案..."
              :disabled="showResults[question.id]"
              @keyup.enter="checkAnswer(question)"
            />
          </div>

          <!-- Result explanation -->
          <div v-if="showResults[question.id]" class="result-block">
            <div :class="['result-badge', isCorrect(question) ? 'correct' : 'wrong']">
              <svg v-if="isCorrect(question)" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
              <span>{{ isCorrect(question) ? '正确' : '错误' }}</span>
            </div>
            <p class="explanation">{{ question.explanation }}</p>
          </div>

          <!-- Check button -->
          <div v-if="!showResults[question.id]" class="question-actions">
            <BaseButton
              variant="secondary"
              size="sm"
              :disabled="!userAnswers[question.id]"
              @click="checkAnswer(question)"
            >
              检查
            </BaseButton>
          </div>
        </div>

        <!-- Summary -->
        <div v-if="allAnswered" class="practice-summary">
          <span class="summary-score">
            得分：{{ correctCount }} / {{ questions.length }}
          </span>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import BaseTag from './BaseTag.vue'
import BaseButton from './BaseButton.vue'
import type { PracticeQuestion, PracticeType, CEFRLevel } from '../types'

interface Props {
  questions: PracticeQuestion[]
}

const props = defineProps<Props>()

const isExpanded = ref(false)
const userAnswers = reactive<Record<string, string>>({})
const showResults = reactive<Record<string, boolean>>({})

function toggleExpand() {
  isExpanded.value = !isExpanded.value
}

function selectOption(questionId: string, option: string) {
  userAnswers[questionId] = option
}

function checkAnswer(question: PracticeQuestion) {
  if (!userAnswers[question.id]) return
  showResults[question.id] = true
}

function isCorrect(question: PracticeQuestion): boolean {
  const answer = userAnswers[question.id]
  if (!answer) return false
  if (Array.isArray(question.correctAnswer)) {
    return question.correctAnswer.includes(answer)
  }
  return answer.toLowerCase().trim() === (question.correctAnswer as string).toLowerCase().trim()
}

const allAnswered = computed(() => {
  return props.questions.every(q => showResults[q.id])
})

const correctCount = computed(() => {
  return props.questions.filter(q => isCorrect(q)).length
})

function getDifficultyVariant(difficulty: CEFRLevel): 'default' | 'primary' | 'success' | 'danger' | 'muted' {
  if (difficulty.startsWith('A')) return 'success'
  if (difficulty.startsWith('B')) return 'primary'
  return 'danger'
}

function getQuestionTypeLabel(type: PracticeType): string {
  const labels: Record<PracticeType, string> = {
    'multiple-choice': '选择题',
    'cloze': '填空题',
    'reading-comprehension': '阅读理解',
    'grammar': '语法题',
    'listening': '听力题',
    'sentence-correction': '句子纠错',
    'fill-blank': '填空题',
    'true-false': '判断题',
    'ordering': '排序题'
  }
  return labels[type] || type
}
</script>

<style scoped>
.segment-practice {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.practice-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-3) var(--space-4);
  cursor: pointer;
  transition: background-color 0.16s ease;
  user-select: none;
}

.practice-header:hover {
  background: var(--color-surface-muted);
}

.practice-title-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.practice-icon {
  color: var(--color-primary);
  flex-shrink: 0;
}

.practice-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text);
}

.practice-count {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  padding: 2px 6px;
  background: var(--color-surface-muted);
  border-radius: var(--radius-sm);
}

.expand-icon {
  color: var(--color-text-muted);
  transition: transform 0.2s ease;
  flex-shrink: 0;
}

.expand-icon.expanded {
  transform: rotate(180deg);
}

.practice-body {
  padding: 0 var(--space-4) var(--space-4);
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.question-block {
  padding-top: var(--space-3);
  border-top: 1px solid var(--color-border);
}

.question-header {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-2);
}

.question-number {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--color-primary);
  color: var(--color-primary-foreground);
  font-size: 0.75rem;
  font-weight: 700;
  flex-shrink: 0;
}

.question-type {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.question-text {
  font-size: 0.9375rem;
  color: var(--color-text);
  line-height: 1.6;
  margin-bottom: var(--space-3);
}

/* Options */
.options-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.option-btn {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.16s ease;
  text-align: left;
}

.option-btn:hover:not(:disabled) {
  border-color: var(--color-border-strong);
  background: var(--color-surface-muted);
}

.option-btn.selected {
  border-color: var(--color-primary);
  background: var(--color-surface-muted);
}

.option-btn.correct {
  border-color: var(--color-success-600);
  background: var(--color-success-50);
}

.option-btn.wrong {
  border-color: var(--color-danger-600);
  background: var(--color-danger-50);
}

.option-btn:disabled {
  cursor: default;
}

.option-letter {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--color-surface-muted);
  color: var(--color-text-muted);
  font-size: 0.75rem;
  font-weight: 700;
  flex-shrink: 0;
}

.option-btn.selected .option-letter {
  background: var(--color-primary);
  color: var(--color-primary-foreground);
}

.option-btn.correct .option-letter {
  background: var(--color-success-600);
  color: #ffffff;
}

.option-btn.wrong .option-letter {
  background: var(--color-danger-600);
  color: #ffffff;
}

.option-text {
  font-size: 0.875rem;
  color: var(--color-text);
}

/* Cloze input */
.cloze-input {
  margin-bottom: var(--space-2);
}

.input-field {
  width: 100%;
  padding: var(--space-2) var(--space-3);
  font-size: 0.9375rem;
  font-family: var(--font-sans);
  color: var(--color-text);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  transition: border-color 0.16s ease, box-shadow 0.16s ease;
}

.input-field:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px rgba(24, 24, 27, 0.08);
}

.input-field:disabled {
  background: var(--color-surface-muted);
  opacity: 0.7;
}

/* Result */
.result-block {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-3);
  background: var(--color-surface-muted);
  border-radius: var(--radius-sm);
  margin-top: var(--space-2);
}

.result-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: 2px 8px;
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  font-weight: 700;
  white-space: nowrap;
  flex-shrink: 0;
}

.result-badge.correct {
  background: var(--color-success-50);
  color: var(--color-success-700);
}

.result-badge.wrong {
  background: var(--color-danger-50);
  color: var(--color-danger-700);
}

.explanation {
  font-size: 0.8125rem;
  color: var(--color-text-muted);
  line-height: 1.5;
  margin: 0;
}

.question-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: var(--space-2);
}

/* Summary */
.practice-summary {
  padding: var(--space-3);
  text-align: center;
  background: var(--color-surface-muted);
  border-radius: var(--radius-sm);
}

.summary-score {
  font-size: 0.9375rem;
  font-weight: 700;
  color: var(--color-text);
}

/* Expand transition */
.expand-enter-active,
.expand-leave-active {
  transition: all 0.2s ease;
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  max-height: 0;
}
</style>
