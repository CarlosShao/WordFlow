<template>
  <div class="practice-page">
    <PageHeader title="练习" subtitle="各类型练习题" />

    <!-- Practice Types -->
    <section class="practice-types">
      <div
        v-for="type in practiceTypes"
        :key="type.value"
        :class="['type-card', { active: selectedType === type.value }]"
        @click="selectType(type.value)"
      >
        <div class="type-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
            <polyline points="10 9 9 9 8 9"/>
          </svg>
        </div>
        <h3 class="type-title">{{ type.label }}</h3>
        <p class="type-desc">{{ type.description }}</p>
      </div>
    </section>

    <!-- Difficulty Filter -->
    <section class="difficulty-section">
      <label class="difficulty-label">选择难度</label>
      <div class="difficulty-options">
        <button
          v-for="level in difficultyLevels"
          :key="level.value"
          :class="['difficulty-btn', { active: selectedDifficulty === level.value }]"
          @click="selectedDifficulty = level.value"
        >
          {{ level.label }}
        </button>
      </div>
    </section>

    <!-- Timed Mode Toggle -->
    <section class="timed-mode-section">
      <Toggle v-model="timedMode" />
      <span class="timed-mode-label">限时模式 (120秒)</span>
    </section>

    <!-- Start Button -->
    <section class="start-section">
      <BaseButton size="lg" @click="startPractice" :disabled="!selectedType" :loading="loading">
        开始练习
      </BaseButton>
    </section>

    <!-- Loading -->
    <section v-if="loading" class="question-section">
      <Skeleton variant="card" />
    </section>

    <!-- Empty State -->
    <EmptyState
      v-else-if="!currentQuestion && !showResults && questions.length === 0"
      title="暂无练习题"
      description="选择练习类型和难度后开始"
    />

    <!-- Question Section -->
    <section v-else-if="currentQuestion" class="question-section">
      <!-- Timer -->
      <div v-if="timedMode" class="timer-wrapper">
        <TimerCountdown :seconds="120" :running="true" @time-up="onTimeUp" @update:remaining="remainingTime = $event" />
      </div>

      <!-- Streak -->
      <StreakAnimation :count="streakCount" :show="showStreak" />
      <div class="question-header">
        <span class="question-number">第 {{ currentIndex + 1 }} 题 / 共 {{ questions.length }} 题</span>
        <span :class="['question-difficulty', `difficulty-${currentQuestion.difficulty}`]">
          {{ currentQuestion.difficulty }}
        </span>
      </div>

      <div class="question-card">
        <!-- Passage for reading comprehension -->
        <div v-if="currentQuestion.passage" class="question-passage">
          <p>{{ currentQuestion.passage }}</p>
        </div>

        <h3 class="question-text">{{ currentQuestion.question }}</h3>

        <!-- Options -->
        <div v-if="currentQuestion.options" class="question-options">
          <button
            v-for="(option, index) in currentQuestion.options"
            :key="index"
            :class="['option-btn', {
              selected: selectedAnswer === option,
              correct: showAnswer && option === currentQuestion.correctAnswer,
              wrong: showAnswer && selectedAnswer === option && option !== currentQuestion.correctAnswer
            }]"
            @click="selectAnswer(option)"
            :disabled="showAnswer"
          >
            <span class="option-letter">{{ String.fromCharCode(65 + index) }}</span>
            <span class="option-text">{{ option }}</span>
          </button>
        </div>

        <!-- Explanation -->
        <div v-if="showAnswer" class="question-explanation">
          <h4>解析</h4>
          <p>{{ currentQuestion.explanation }}</p>
        </div>
      </div>

      <!-- Controls -->
      <div class="question-controls">
        <BaseButton v-if="!showAnswer" variant="secondary" @click="submitAnswer" :disabled="!selectedAnswer">
          提交答案
        </BaseButton>
        <BaseButton v-else @click="nextQuestion">
          {{ currentIndex < questions.length - 1 ? '下一题' : '完成' }}
        </BaseButton>
      </div>

      <!-- Progress -->
      <div class="question-progress">
        <BaseProgress :value="((currentIndex + 1) / questions.length) * 100" :show-value="false" />
        <span class="progress-text">{{ currentIndex + 1 }} / {{ questions.length }}</span>
      </div>
    </section>

    <!-- Results -->
    <section v-if="showResults" class="results-section">
      <PracticeSummary
        :total-questions="questions.length"
        :correct-answers="correctCount"
        :total-time="120 - remainingTime"
        :points="score"
        :weak-tags="[]"
        @retry="resetPractice"
        @view-mistakes="$router.push('/mistakes')"
      />
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { practiceApi } from '../api'
import { PageHeader, BaseButton, BaseProgress, Skeleton, EmptyState, Toggle, TimerCountdown, StreakAnimation, PracticeSummary } from '../components'
import { useToast } from '../composables/useToast'
import type { PracticeType, PracticeQuestion, CEFRLevel } from '../types'

const selectedType = ref<PracticeType | null>(null)
const selectedDifficulty = ref<CEFRLevel>('B1')
const questions = ref<PracticeQuestion[]>([])
const currentIndex = ref(0)
const selectedAnswer = ref<string | null>(null)
const showAnswer = ref(false)
const showResults = ref(false)
const score = ref(0)
const correctCount = ref(0)
const loading = ref(false)
const toast = useToast()
const streakCount = ref(0)
const showStreak = ref(false)
const timedMode = ref(false)
const remainingTime = ref(0)

const practiceTypes = [
  { value: 'cloze' as PracticeType, label: '完形填空', description: '根据上下文选择正确的单词' },
  { value: 'reading-comprehension' as PracticeType, label: '阅读理解', description: '阅读文章回答问题' },
  { value: 'grammar' as PracticeType, label: '语法专项', description: '测试语法知识' },
  { value: 'sentence-correction' as PracticeType, label: '句子改错', description: '找出句子中的错误' }
]

const difficultyLevels = [
  { value: 'A1' as CEFRLevel, label: 'A1 入门' },
  { value: 'A2' as CEFRLevel, label: 'A2 基础' },
  { value: 'B1' as CEFRLevel, label: 'B1 中级' },
  { value: 'B2' as CEFRLevel, label: 'B2 中高级' },
  { value: 'C1' as CEFRLevel, label: 'C1 高级' }
]

const currentQuestion = computed(() => {
  if (questions.value.length === 0) return null
  return questions.value[currentIndex.value]
})

function selectType(type: PracticeType) {
  selectedType.value = type
}

async function startPractice() {
  if (!selectedType.value) return
  
  loading.value = true
  const res = await practiceApi.getQuestions({
    type: selectedType.value,
    difficulty: selectedDifficulty.value,
    limit: 10
  })
  loading.value = false
  
  if (res.success) {
    questions.value = res.data
    currentIndex.value = 0
    selectedAnswer.value = null
    showAnswer.value = false
    showResults.value = false
    score.value = 0
    correctCount.value = 0
    streakCount.value = 0
    showStreak.value = false
    remainingTime.value = 120
  }
}

function selectAnswer(answer: string) {
  if (!showAnswer.value) {
    selectedAnswer.value = answer
  }
}

async function submitAnswer() {
  if (!selectedAnswer.value || !currentQuestion.value) return
  
  showAnswer.value = true
  
  const res = await practiceApi.submitAnswer(currentQuestion.value.id, selectedAnswer.value)
  if (res.success && res.data.correct) {
    correctCount.value++
    score.value += res.data.points
    streakCount.value++
    if (streakCount.value >= 3) {
      showStreak.value = true
    }
    toast.success('回答正确！')
  } else {
    streakCount.value = 0
    showStreak.value = false
    toast.error('答错了，继续加油！')
  }
}

function nextQuestion() {
  if (currentIndex.value < questions.value.length - 1) {
    currentIndex.value++
    selectedAnswer.value = null
    showAnswer.value = false
  } else {
    showResults.value = true
  }
}

function resetPractice() {
  selectedType.value = null
  questions.value = []
  showResults.value = false
  streakCount.value = 0
  showStreak.value = false
}

function onTimeUp() {
  toast.warning('时间到！自动提交')
  showResults.value = true
}
</script>

<style scoped>
.practice-page {
  padding: var(--space-6);
  max-width: 1200px;
  margin: 0 auto;
}

/* Practice Types */
.practice-types {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--space-4);
  margin-bottom: var(--space-6);
}

.type-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-4);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.16s ease;
}

.type-card:hover {
  border-color: var(--color-border-strong);
  box-shadow: var(--shadow-sm);
}

.type-card.active {
  border-color: var(--color-primary);
  background: var(--color-surface-muted);
}

.type-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: var(--radius-md);
  background: var(--color-surface-muted);
  color: var(--color-text-muted);
}

.type-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text);
}

.type-desc {
  font-size: 0.8125rem;
  color: var(--color-text-muted);
  text-align: center;
}

/* Difficulty */
.difficulty-section {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}

.difficulty-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text-muted);
}

.difficulty-options {
  display: flex;
  gap: var(--space-1);
}

.difficulty-btn {
  padding: var(--space-1) var(--space-3);
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--color-text-muted);
  background: var(--color-surface-muted);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.16s ease;
}

.difficulty-btn:hover {
  background: var(--color-surface);
  color: var(--color-text);
}

.difficulty-btn.active {
  background: var(--color-primary);
  color: var(--color-primary-foreground);
  border-color: var(--color-primary);
}

/* Timed Mode */
.timed-mode-section {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}

.timed-mode-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text-muted);
}

/* Toggle */
.toggle {
  position: relative;
  display: inline-block;
  width: 48px;
  height: 24px;
}

.toggle input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  inset: 0;
  background-color: var(--color-surface-muted);
  border: 1px solid var(--color-border);
  border-radius: 999px;
  transition: 0.2s;
}

.toggle-slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 2px;
  bottom: 2px;
  background-color: var(--color-text-muted);
  border-radius: 50%;
  transition: 0.2s;
}

.toggle input:checked + .toggle-slider {
  background-color: var(--color-primary);
  border-color: var(--color-primary);
}

.toggle input:checked + .toggle-slider:before {
  background-color: var(--color-primary-foreground);
  transform: translateX(24px);
}

/* Timer */
.timer-wrapper {
  display: flex;
  justify-content: center;
  margin-bottom: var(--space-4);
}

/* Start */
.start-section {
  display: flex;
  justify-content: center;
  margin-bottom: var(--space-6);
}

/* Question */
.question-section {
  max-width: 640px;
  margin: 0 auto;
}

.question-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-4);
}

.question-number {
  font-size: 0.875rem;
  color: var(--color-text-muted);
}

.question-difficulty {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  font-size: 0.75rem;
  font-weight: 600;
  border-radius: var(--radius-sm);
}

.difficulty-A1 { background: var(--color-success-50); color: var(--color-success-700); }
.difficulty-A2 { background: var(--color-success-50); color: var(--color-success-600); }
.difficulty-B1 { background: #fef3c7; color: #d97706; }
.difficulty-B2 { background: #fef3c7; color: #b45309; }
.difficulty-C1 { background: var(--color-danger-50); color: var(--color-danger-600); }
.difficulty-C2 { background: var(--color-danger-50); color: var(--color-danger-700); }

.question-card {
  padding: var(--space-6);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  margin-bottom: var(--space-4);
}

.question-passage {
  padding: var(--space-4);
  background: var(--color-surface-muted);
  border-radius: var(--radius-md);
  margin-bottom: var(--space-4);
  line-height: 1.8;
  color: var(--color-text);
}

.question-text {
  font-size: 1.0625rem;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: var(--space-4);
  line-height: 1.6;
}

.question-options {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.option-btn {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.16s ease;
  text-align: left;
}

.option-btn:hover:not(:disabled) {
  background: var(--color-surface-muted);
  border-color: var(--color-border-strong);
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
  cursor: not-allowed;
  opacity: 0.8;
}

.option-letter {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--color-surface-muted);
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-text-muted);
  flex-shrink: 0;
}

.option-btn.selected .option-letter {
  background: var(--color-primary);
  color: var(--color-primary-foreground);
}

.option-btn.correct .option-letter {
  background: var(--color-success-600);
  color: white;
}

.option-btn.wrong .option-letter {
  background: var(--color-danger-600);
  color: white;
}

.option-text {
  flex: 1;
  font-size: 0.9375rem;
  color: var(--color-text);
}

.question-explanation {
  margin-top: var(--space-4);
  padding: var(--space-4);
  background: var(--color-surface-muted);
  border-radius: var(--radius-md);
}

.question-explanation h4 {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-text-muted);
  margin-bottom: var(--space-2);
}

.question-explanation p {
  font-size: 0.9375rem;
  color: var(--color-text);
  line-height: 1.6;
}

.question-controls {
  display: flex;
  justify-content: center;
  margin-bottom: var(--space-4);
}

.question-progress {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
}

.progress-text {
  font-size: 0.8125rem;
  color: var(--color-text-muted);
}

/* Results */
.results-section {
  max-width: 480px;
  margin: 0 auto;
  display: flex;
  justify-content: center;
}
</style>
