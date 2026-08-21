<template>
  <div class="reading-page">
    <PageHeader title="阅读" subtitle="来自全球的英文文章" />

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

      <div class="filter-group">
        <label class="filter-label">来源</label>
        <div class="filter-options">
          <button
            v-for="source in sources"
            :key="source"
            :class="['filter-btn', { active: selectedSource === source }]"
            @click="selectedSource = selectedSource === source ? null : source"
          >
            {{ source }}
          </button>
        </div>
      </div>
    </section>

    <!-- Article List -->
    <section v-if="loading" class="articles-grid">
      <Skeleton variant="card" />
      <Skeleton variant="card" />
      <Skeleton variant="card" />
      <Skeleton variant="card" />
      <Skeleton variant="card" />
      <Skeleton variant="card" />
    </section>

    <EmptyState
      v-else-if="articles.length === 0"
      title="暂无文章"
      description="试试调整筛选条件"
    />

    <section v-else class="articles-grid">
      <article
        v-for="article in articles"
        :key="article.id"
        class="article-card"
        @click="selectArticle(article)"
      >
        <div v-if="article.coverImage" class="article-cover">
          <img :src="article.coverImage" :alt="article.title" referrerpolicy="no-referrer" />
        </div>
        <div class="article-content">
          <div class="article-meta">
            <span class="article-source">{{ article.source }}</span>
            <span :class="['article-difficulty', `difficulty-${article.difficulty}`]">
              {{ article.difficulty }}
            </span>
          </div>
          <h3 class="article-title">{{ article.title }}</h3>
          <p class="article-summary">{{ article.summary }}</p>
          <div class="article-footer">
            <span class="article-words">{{ article.wordCount }}词</span>
            <span class="article-time">{{ article.estimatedMinutes }}分钟</span>
            <span class="article-vocab">{{ article.vocabularyCount }}个生词</span>
          </div>
          <div class="article-tags">
            <span v-for="tag in article.tags" :key="tag" class="article-tag">
              {{ tag }}
            </span>
          </div>
        </div>
      </article>
    </section>

    <!-- Article Detail Modal -->
    <BaseModal v-model="showDetail" :title="selectedArticle?.title || ''" size="lg">
      <template #header>
        <div class="detail-header-controls">
          <ReadingTimer v-if="selectedArticle" :word-count="selectedArticle.wordCount" />
          <TranslationToggle v-model="translationMode" />
        </div>
      </template>
      <div v-if="selectedArticle" class="article-detail">
        <div class="article-detail-title-row">
          <h2 class="detail-title">{{ selectedArticle.title }}</h2>
          <PronunciationBtn :text="selectedArticle.title" />
        </div>
        <div class="article-detail-meta">
          <span class="detail-source">{{ selectedArticle.source }}</span>
          <span :class="['detail-difficulty', `difficulty-${selectedArticle.difficulty}`]">
            {{ selectedArticle.difficulty }}
          </span>
          <span class="detail-words">{{ selectedArticle.wordCount }}词</span>
          <span class="detail-time">{{ selectedArticle.estimatedMinutes }}分钟</span>
        </div>
        <div class="article-detail-content">
          <p v-for="(paragraph, index) in selectedArticle.content.split('\n\n')" :key="index" class="article-paragraph">
            {{ paragraph }}
          </p>
        </div>
      </div>
      <template #footer>
        <BaseButton variant="secondary" @click="showDetail = false">关闭</BaseButton>
        <BaseButton @click="startReading">开始阅读</BaseButton>
      </template>
    </BaseModal>

    <WordTooltip
      :visible="tooltipVisible"
      :x="tooltipX"
      :y="tooltipY"
      :word="tooltipWord"
      :definition="tooltipDef"
      :chinese-definition="tooltipChinese"
      @close="tooltipVisible = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue'
import { useContentStore } from '../stores/content'
import { PageHeader, BaseModal, BaseButton, Skeleton, EmptyState, WordTooltip, ReadingTimer, TranslationToggle, PronunciationBtn } from '../components'
import { useToast } from '../composables/useToast'
import { debounce } from '../utils/debounce'
import { DIFFICULTY_LEVELS } from '../utils/constants'
import type { Article, CEFRLevel, ArticleSource } from '../types'

const contentStore = useContentStore()
const articles = computed(() => contentStore.articles)
const selectedDifficulty = ref<CEFRLevel | null>(null)
const selectedSource = ref<ArticleSource | null>(null)
const showDetail = ref(false)
const selectedArticle = ref<Article | null>(null)
const loading = computed(() => contentStore.loading)
const toast = useToast()
const tooltipVisible = ref(false)
const tooltipX = ref(0)
const tooltipY = ref(0)
const tooltipWord = ref('')
const tooltipDef = ref('')
const tooltipChinese = ref('')
const translationMode = ref<'original' | 'bilingual' | 'translated'>('original')

const difficultyLevels = DIFFICULTY_LEVELS

const sources: ArticleSource[] = ['BBC', 'CNN', 'NYT', 'Reddit', 'X', 'Medium', 'TED', 'YouTube']

async function fetchArticles() {
  await contentStore.fetchArticles({
    difficulty: selectedDifficulty.value || undefined,
    source: selectedSource.value || undefined
  })
}

const debouncedFetch = debounce(fetchArticles, 300)

watch([selectedDifficulty, selectedSource], debouncedFetch)

onMounted(fetchArticles)

function selectArticle(article: Article) {
  selectedArticle.value = article
  showDetail.value = true
  toast.success('已打开文章')
}

function startReading() {
  // TODO: Implement reading mode
  showDetail.value = false
}
</script>

<style scoped>
.reading-page {
  padding: var(--space-6);
  max-width: 1200px;
  margin: 0 auto;
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
  white-space: nowrap;
}

.filter-options {
  display: flex;
  gap: var(--space-1);
  flex-wrap: wrap;
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

/* Articles Grid */
.articles-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: var(--space-4);
}

.article-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
  cursor: pointer;
  transition: border-color 0.16s ease, box-shadow 0.16s ease;
}

.article-card:hover {
  border-color: var(--color-border-strong);
  box-shadow: var(--shadow-md);
}

.article-cover {
  width: 100%;
  height: 180px;
  overflow: hidden;
}

.article-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.article-content {
  padding: var(--space-4);
}

.article-meta {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-2);
}

.article-source {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.article-difficulty,
.detail-difficulty {
  display: inline-flex;
  align-items: center;
  padding: 2px 6px;
  font-size: 0.6875rem;
  font-weight: 600;
  border-radius: var(--radius-sm);
}

.difficulty-A1 { background: var(--color-success-50); color: var(--color-success-700); }
.difficulty-A2 { background: var(--color-success-50); color: var(--color-success-600); }
.difficulty-B1 { background: #fef3c7; color: #d97706; }
.difficulty-B2 { background: #fef3c7; color: #b45309; }
.difficulty-C1 { background: var(--color-danger-50); color: var(--color-danger-600); }
.difficulty-C2 { background: var(--color-danger-50); color: var(--color-danger-700); }

.article-title {
  font-size: 1.0625rem;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: var(--space-2);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.article-summary {
  font-size: 0.875rem;
  color: var(--color-text-muted);
  line-height: 1.5;
  margin-bottom: var(--space-3);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.article-footer {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: var(--space-2);
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.article-tags {
  display: flex;
  gap: var(--space-1);
  flex-wrap: wrap;
}

.article-tag {
  padding: 2px 6px;
  font-size: 0.6875rem;
  color: var(--color-text-muted);
  background: var(--color-surface-muted);
  border-radius: var(--radius-sm);
}

/* Article Detail */
.article-detail {
  max-height: 60vh;
  overflow-y: auto;
}

.article-detail-meta {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
  padding-bottom: var(--space-4);
  border-bottom: 1px solid var(--color-border);
  font-size: 0.8125rem;
  color: var(--color-text-muted);
}

.article-detail-content {
  line-height: 1.8;
}

.article-paragraph {
  margin-bottom: var(--space-4);
  color: var(--color-text);
}

.article-paragraph:last-child {
  margin-bottom: 0;
}

/* Detail Header Controls */
.detail-header-controls {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding-bottom: var(--space-3);
  border-bottom: 1px solid var(--color-border);
  margin-bottom: var(--space-4);
}

/* Detail Title Row */
.article-detail-title-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: var(--space-3);
}

.detail-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-text);
  margin: 0;
}
</style>
