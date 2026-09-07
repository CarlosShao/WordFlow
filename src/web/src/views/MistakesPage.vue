<template>
  <div class="mistakes-page">
    <PageHeader title="错题本" subtitle="薄弱点追踪与复习" />

    <!-- Stats -->
    <section class="stats-section">
      <div class="stat-card">
        <span class="stat-value">{{ mistakesStore.stats.total }}</span>
        <span class="stat-label">总错题</span>
      </div>
      <div class="stat-card">
        <span class="stat-value stat-danger">{{ mistakesStore.stats.notReviewed }}</span>
        <span class="stat-label">待复习</span>
      </div>
      <div class="stat-card">
        <span class="stat-value stat-warning">{{ mistakesStore.stats.reviewing }}</span>
        <span class="stat-label">复习中</span>
      </div>
      <div class="stat-card">
        <span class="stat-value stat-success">{{ mistakesStore.stats.mastered }}</span>
        <span class="stat-label">已掌握</span>
      </div>
    </section>

    <!-- Filters -->
    <section class="filters-section">
      <BaseTabs
        :model-value="mistakesStore.activeFilter"
        :tabs="filterTabs"
        @update:model-value="onFilterChange"
      />
    </section>

    <!-- Mistakes List -->
    <section class="mistakes-list">
      <Skeleton v-if="mistakesStore.loading" variant="card" />

      <ErrorState
        v-else-if="mistakesStore.error"
        title="错题加载失败"
        :message="mistakesStore.error"
        @retry="mistakesStore.fetchList()"
      />

      <EmptyState
        v-else-if="mistakesStore.filteredMistakes.length === 0"
        title="没有找到错题"
        description="做得不错，继续保持！"
      />

      <div v-for="mistake in mistakesStore.filteredMistakes" :key="mistake.id" class="mistake-card">
        <div class="mistake-header">
          <div class="mistake-meta">
            <span class="mistake-type">
              {{ getTypeLabel(mistake.questionType) }}
            </span>
            <span v-if="mistake.vocabulary?.word" class="mistake-word">
              {{ mistake.vocabulary.word }}
            </span>
            <span v-if="mistake.difficulty" :class="['mistake-difficulty', `difficulty-${getDifficultyLevel(mistake.difficulty)}`]">
              {{ getDifficultyLabel(mistake.difficulty) }}
            </span>
            <span :class="['mistake-status', `status-${mistake.masteryStatus.toLowerCase()}`]">
              {{ getStatusLabel(mistake.masteryStatus) }}
            </span>
          </div>
          <span class="mistake-date">{{ formatDate(mistake.lastWrongAt ?? mistake.createdAt) }}</span>
        </div>

        <div class="mistake-question">
          <div class="mistake-question-row">
            <h3>{{ mistake.question }}</h3>
            <PronunciationBtn :text="mistake.question" size="sm" />
          </div>
        </div>

        <div class="mistake-answers">
          <div class="answer-item wrong">
            <span class="answer-label">你的答案</span>
            <span class="answer-value">{{ mistake.userAnswer ?? mistake.wrongAnswer ?? '—' }}</span>
          </div>
          <div class="answer-item correct">
            <span class="answer-label">正确答案</span>
            <span class="answer-value">{{ mistake.correctAnswer }}</span>
          </div>
        </div>

        <div class="mistake-explanation">
          <h4>解析</h4>
          <p>{{ mistake.explanation || '暂无解析' }}</p>
        </div>

        <div class="mistake-actions">
          <BaseButton size="sm" variant="secondary" @click="updateStatus(mistake.id, 'REVIEWING')">
            标记为复习中
          </BaseButton>
          <BaseButton size="sm" variant="primary" @click="updateStatus(mistake.id, 'MASTERED')">
            标记为已掌握
          </BaseButton>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { PageHeader, BaseTabs, BaseButton, Skeleton, EmptyState, ErrorState, PronunciationBtn } from '../components'
import { useMistakesStore } from '../stores/mistakes'
import { useToast } from '../composables/useToast'
import type { MistakeMasteryStatus } from '../types'

const mistakesStore = useMistakesStore()
const toast = useToast()

const filterTabs = [
  { value: 'all', label: '全部' },
  { value: 'NOT_REVIEWED', label: '待复习' },
  { value: 'REVIEWING', label: '复习中' },
  { value: 'MASTERED', label: '已掌握' }
]

onMounted(() => {
  mistakesStore.fetchList()
  mistakesStore.fetchStats()
})

function onFilterChange(value: unknown) {
  mistakesStore.setFilter(value as MistakeMasteryStatus | 'all')
}

// 后端 QuestionType 枚举 → 中文标签
function getTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    'VOCABULARY': '词义',
    'MULTIPLE_CHOICE': '选择',
    'CLOZE': '完形填空',
    'FILL_BLANK': '填空',
    'LISTENING': '听写',
    'READING_COMPREHENSION': '阅读理解',
    'GRAMMAR': '语法',
    'TRANSLATION': '翻译'
  }
  return labels[type] || type
}

// 后端 Difficulty 枚举 → CEFR 显示（复用现有 difficulty-A1... 样式）
function getDifficultyLevel(difficulty: string): string {
  const levels: Record<string, string> = {
    'BEGINNER': 'A1',
    'ELEMENTARY': 'A2',
    'INTERMEDIATE': 'B1',
    'UPPER_INTERMEDIATE': 'B2',
    'ADVANCED': 'C1',
    'PROFICIENT': 'C2'
  }
  return levels[difficulty] || difficulty
}

function getDifficultyLabel(difficulty: string): string {
  return getDifficultyLevel(difficulty)
}

function getStatusLabel(status: MistakeMasteryStatus | string): string {
  const labels: Record<string, string> = {
    'NOT_REVIEWED': '待复习',
    'REVIEWING': '复习中',
    'MASTERED': '已掌握'
  }
  return labels[status] || status
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '—'
  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('zh-CN')
}

async function updateStatus(id: string, status: MistakeMasteryStatus) {
  const result = await mistakesStore.updateMastery(id, status)
  if (result.success) {
    toast.success(status === 'MASTERED' ? '已标记为掌握' : '已标记为复习中')
  } else {
    toast.error(result.error || '更新失败')
  }
}
</script>

<style scoped>
.mistakes-page {
  padding: var(--space-6);
  max-width: 1200px;
  margin: 0 auto;
}

/* Filters */
.stats-section {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-4);
  margin-bottom: var(--space-6);
}

.stat-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: var(--space-4);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.stat-value {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--color-text);
}

.stat-danger { color: var(--color-danger-600); }
.stat-warning { color: var(--color-warning-600); }
.stat-success { color: var(--color-success-600); }

.stat-label {
  font-size: 0.8125rem;
  color: var(--color-text-muted);
}

/* Filters */
.filters-section {
  margin-bottom: var(--space-4);
}

/* Mistakes List */
.mistakes-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-8);
  text-align: center;
}

.empty-state p {
  font-size: 1rem;
  color: var(--color-text-muted);
}

.mistake-card {
  padding: var(--space-4);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
}

.mistake-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-3);
}

.mistake-meta {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.mistake-type {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  font-size: 0.6875rem;
  font-weight: 600;
  border-radius: var(--radius-sm);
  background: var(--color-surface-muted);
  color: var(--color-text-muted);
}

.mistake-word {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  font-size: 0.6875rem;
  font-weight: 600;
  border-radius: var(--radius-sm);
  background: var(--color-primary);
  color: var(--color-primary-foreground);
}

.mistake-difficulty {
  display: inline-flex;
  align-items: center;
  padding: 2px 6px;
  font-size: 0.6875rem;
  font-weight: 600;
  border-radius: var(--radius-sm);
}

.difficulty-A1 { background: var(--color-success-50); color: var(--color-success-700); }
.difficulty-A2 { background: var(--color-success-50); color: var(--color-success-600); }
.difficulty-B1 { background: var(--color-warning-100); color: var(--color-warning-600); }
.difficulty-B2 { background: var(--color-warning-100); color: var(--color-warning-700); }
.difficulty-C1 { background: var(--color-danger-50); color: var(--color-danger-600); }
.difficulty-C2 { background: var(--color-danger-50); color: var(--color-danger-700); }

.mistake-status {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  font-size: 0.6875rem;
  font-weight: 600;
  border-radius: var(--radius-sm);
}

.status-not-reviewed { background: var(--color-danger-50); color: var(--color-danger-700); }
.status-reviewing { background: var(--color-warning-100); color: var(--color-warning-600); }
.status-mastered { background: var(--color-success-50); color: var(--color-success-700); }

.mistake-date {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.mistake-question {
  margin-bottom: var(--space-3);
}

.mistake-passage {
  padding: var(--space-3);
  background: var(--color-surface-muted);
  border-radius: var(--radius-md);
  margin-bottom: var(--space-2);
  font-size: 0.9375rem;
  line-height: 1.6;
  color: var(--color-text);
}

.mistake-question h3 {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text);
  line-height: 1.5;
}

.mistake-question-row {
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
}

.mistake-question-row h3 {
  flex: 1;
  margin: 0;
}

.mistake-answers {
  display: flex;
  gap: var(--space-4);
  margin-bottom: var(--space-3);
}

.answer-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  padding: var(--space-3);
  border-radius: var(--radius-md);
}

.answer-item.wrong {
  background: var(--color-danger-50);
  border: 1px solid var(--color-danger-200);
}

.answer-item.correct {
  background: var(--color-success-50);
  border: 1px solid var(--color-success-200);
}

.answer-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text-muted);
}

.answer-value {
  font-size: 0.9375rem;
  font-weight: 600;
}

.answer-item.wrong .answer-value {
  color: var(--color-danger-700);
}

.answer-item.correct .answer-value {
  color: var(--color-success-700);
}

.mistake-explanation {
  padding: var(--space-3);
  background: var(--color-surface-muted);
  border-radius: var(--radius-md);
  margin-bottom: var(--space-3);
}

.mistake-explanation h4 {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text-muted);
  margin-bottom: var(--space-1);
}

.mistake-explanation p {
  font-size: 0.9375rem;
  color: var(--color-text);
  line-height: 1.6;
}

.mistake-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
}
</style>
