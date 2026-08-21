<template>
  <div class="examples-page">
    <PageHeader title="例句库" subtitle="来自真实语境的例句" />

    <!-- Search Section -->
    <section class="search-section">
      <BaseInput v-model="searchQuery" placeholder="搜索单词或短语...">
        <template #prefix>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.3-4.3"/>
          </svg>
        </template>
      </BaseInput>
      <BaseButton @click="search">搜索</BaseButton>
    </section>

    <!-- Filters -->
    <section class="filters-section">
      <div class="filter-group">
        <label class="filter-label">难度</label>
        <div class="filter-options">
          <button
            v-for="level in difficultyLevels"
            :key="level.value"
            :class="['filter-btn', { active: selectedDifficulty === level.value }]"
            @click="selectedDifficulty = selectedDifficulty === level.value ? null : level.value"
          >
            {{ level.label }}
          </button>
        </div>
      </div>
    </section>

    <!-- Loading -->
    <section v-if="loading" class="results-section">
      <Skeleton variant="text" :lines="5" />
    </section>

    <!-- Results -->
    <section v-else class="results-section">
      <EmptyState
        v-if="results.length === 0 && hasSearched"
        title="没有找到相关例句"
        description="试试其他关键词"
      />

      <div v-else class="results-list">
        <div v-for="example in results" :key="example.id" class="example-card">
          <div class="example-content">
            <div class="example-sentence-row">
              <p class="example-sentence" v-html="highlightText(example.sentence, example.wordHighlight)" />
              <PronunciationBtn :text="example.sentence" size="sm" />
            </div>
            <p class="example-translation">{{ example.translation }}</p>
          </div>
          <div class="example-meta">
            <span class="example-source">{{ example.source }}</span>
            <span :class="['example-difficulty', `difficulty-${example.difficulty}`]">
              {{ example.difficulty }}
            </span>
            <BaseButton size="sm" variant="ghost" @click="addToVocabulary(example)">
              收藏
            </BaseButton>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useVocabularyStore } from '../stores/vocabulary'
import { PageHeader, BaseInput, BaseButton, Skeleton, EmptyState, PronunciationBtn } from '../components'
import { useToast } from '../composables/useToast'
import { debounce } from '../utils/debounce'
import type { ExampleSearchResult, CEFRLevel } from '../types'

const vocabStore = useVocabularyStore()
const searchQuery = ref('')
const selectedDifficulty = ref<CEFRLevel | null>(null)
const results = computed(() => vocabStore.exampleResults)
const hasSearched = ref(false)
const loading = computed(() => vocabStore.examplesLoading)
const toast = useToast()

const difficultyLevels = [
  { value: 'A1' as CEFRLevel, label: 'A1' },
  { value: 'A2' as CEFRLevel, label: 'A2' },
  { value: 'B1' as CEFRLevel, label: 'B1' },
  { value: 'B2' as CEFRLevel, label: 'B2' },
  { value: 'C1' as CEFRLevel, label: 'C1' },
  { value: 'C2' as CEFRLevel, label: 'C2' }
]

const debouncedSearch = debounce(async () => {
  if (!searchQuery.value.trim()) return

  hasSearched.value = true
  await vocabStore.searchExamples(
    searchQuery.value,
    selectedDifficulty.value || undefined
  )
  toast.info(`找到 ${results.value.length} 条结果`)
}, 300)

async function search() {
  debouncedSearch()
}

function highlightText(text: string, highlight: string): string {
  if (!highlight) return text
  const regex = new RegExp(`(${highlight})`, 'gi')
  return text.replace(regex, '<mark>$1</mark>')
}

async function addToVocabulary(example: ExampleSearchResult) {
  const word = example.wordHighlight?.trim()
  if (!word) {
    toast.warning('无可收藏的单词')
    return
  }
  const result = await vocabStore.addWord(word)
  if (result.success) {
    toast.success(`已收藏「${word}」`)
  } else {
    toast.error(result.error ?? '收藏失败')
  }
}
</script>

<style scoped>
.examples-page {
  padding: var(--space-6);
  max-width: 1200px;
  margin: 0 auto;
}

/* Search Section */
.search-section {
  display: flex;
  gap: var(--space-2);
  margin-bottom: var(--space-4);
}

/* Filters */
.filters-section {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-4);
  margin-bottom: var(--space-6);
  padding: var(--space-4);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.filter-group {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.filter-label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-text-muted);
}

.filter-options {
  display: flex;
  gap: var(--space-1);
}

.filter-btn {
  padding: var(--space-1) var(--space-2);
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--color-text-muted);
  background: var(--color-surface-muted);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.16s ease;
}

.filter-btn:hover {
  background: var(--color-surface);
  color: var(--color-text);
}

.filter-btn.active {
  background: var(--color-primary);
  color: var(--color-primary-foreground);
  border-color: var(--color-primary);
}

/* Results */
.results-section {
  margin-bottom: var(--space-6);
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

.results-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.example-card {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-4);
  padding: var(--space-4);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  transition: border-color 0.16s ease;
}

.example-card:hover {
  border-color: var(--color-border-strong);
}

.example-content {
  flex: 1;
  min-width: 0;
}

.example-sentence-row {
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
  margin-bottom: var(--space-2);
}

.example-sentence {
  font-size: 1rem;
  color: var(--color-text);
  line-height: 1.6;
  flex: 1;
}

.example-sentence :deep(mark) {
  background: var(--color-success-50);
  color: var(--color-success-700);
  padding: 1px 4px;
  border-radius: var(--radius-sm);
  font-weight: 600;
}

.example-translation {
  font-size: 0.875rem;
  color: var(--color-text-muted);
  line-height: 1.5;
}

.example-meta {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-shrink: 0;
}

.example-source {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text-muted);
}

.example-difficulty {
  display: inline-flex;
  align-items: center;
  padding: 1px 4px;
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
</style>
