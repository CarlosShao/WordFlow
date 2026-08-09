<template>
  <div class="content-page">
    <PageHeader title="内容" subtitle="发现优质英语学习内容" />

    <!-- Filter Bar -->
    <section class="filter-bar">
      <!-- Type Tabs -->
      <div class="filter-row">
        <BaseTabs
          v-model="selectedType"
          :tabs="typeTabs"
        />
      </div>

      <!-- Category Pills -->
      <div class="filter-row">
        <span class="filter-label">分类</span>
        <div class="filter-pills">
          <button
            v-for="cat in categoryOptions"
            :key="cat.value"
            :class="['pill-btn', { active: selectedCategory === cat.value }]"
            @click="selectedCategory = selectedCategory === cat.value ? '' : cat.value"
          >
            {{ cat.label }}
          </button>
        </div>
      </div>

      <!-- Difficulty -->
      <div class="filter-row">
        <span class="filter-label">难度</span>
        <div class="filter-pills">
          <button
            v-for="level in difficultyLevels"
            :key="level.value"
            :class="['pill-btn', 'difficulty-pill', `diff-${level.value}`, { active: selectedDifficulty === level.value }]"
            @click="selectedDifficulty = selectedDifficulty === level.value ? '' : level.value"
          >
            {{ level.label }}
          </button>
        </div>
      </div>
    </section>

    <!-- Loading State -->
    <section v-if="content.loading" class="content-grid">
      <div v-for="i in 6" :key="i" class="card-skeleton">
        <Skeleton variant="card" />
      </div>
    </section>

    <!-- Empty State -->
    <EmptyState
      v-else-if="content.items.length === 0"
      title="暂无内容"
      description="试试调整筛选条件，或稍后再来看看"
      icon="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
    />

    <!-- Content Grid -->
    <section v-else class="content-grid">
      <article
        v-for="item in content.items"
        :key="item.id"
        class="content-card"
        @click="goToDetail(item.id)"
      >
        <!-- Cover Image -->
        <div class="card-cover" :class="`cover-${item.type}`">
          <img v-if="item.coverImage" :src="item.coverImage" :alt="item.title" />
          <div v-else class="cover-placeholder" :class="`placeholder-${item.type}`">
            <!-- Article icon -->
            <svg v-if="item.type === 'article'" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
            <!-- Video icon -->
            <svg v-else-if="item.type === 'video'" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <polygon points="23 7 16 12 23 17 23 7" />
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
            </svg>
            <!-- Podcast icon -->
            <svg v-else width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          </div>

          <!-- Type Badge -->
          <span :class="['type-badge', `badge-${item.type}`]">
            {{ getTypeLabel(item.type) }}
          </span>
        </div>

        <!-- Card Content -->
        <div class="card-body">
          <h3 class="card-title">{{ item.title }}</h3>
          <div class="card-meta">
            <span class="meta-source">{{ item.source }}</span>
            <span :class="['meta-difficulty', `difficulty-${item.difficulty}`]">
              {{ item.difficulty }}
            </span>
          </div>
          <p class="card-summary">{{ item.summary }}</p>
          <div class="card-footer">
            <span class="footer-stat">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              {{ getDurationLabel(item) }}
            </span>
            <span class="footer-stat">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
              {{ item.vocabularyCount }} 生词
            </span>
          </div>
        </div>
      </article>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { PageHeader, Skeleton, EmptyState, BaseTabs } from '../components'
import { useContentStore } from '../stores/content'
import type { ContentType, ContentCategory, CEFRLevel } from '../types'

const router = useRouter()
const content = useContentStore()

const selectedType = ref('')
const selectedCategory = ref('')
const selectedDifficulty = ref<CEFRLevel | ''>('')

const typeTabs = [
  { value: '', label: '全部' },
  { value: 'article', label: '文章' },
  { value: 'video', label: '视频' },
  { value: 'podcast', label: '播客' }
]

const categoryOptions = [
  { value: 'news', label: '新闻' },
  { value: 'technology', label: '科技' },
  { value: 'science', label: '科学' },
  { value: 'culture', label: '文化' },
  { value: 'business', label: '商务' },
  { value: 'education', label: '教育' }
]

const difficultyLevels = [
  { value: 'A1' as CEFRLevel, label: 'A1' },
  { value: 'A2' as CEFRLevel, label: 'A2' },
  { value: 'B1' as CEFRLevel, label: 'B1' },
  { value: 'B2' as CEFRLevel, label: 'B2' },
  { value: 'C1' as CEFRLevel, label: 'C1' },
  { value: 'C2' as CEFRLevel, label: 'C2' }
]

function fetchContent() {
  content.fetchList({
    type: (selectedType.value as ContentType) || undefined,
    category: (selectedCategory.value as ContentCategory) || undefined,
    difficulty: selectedDifficulty.value || undefined,
  })
}

watch([selectedType, selectedCategory, selectedDifficulty], fetchContent)

onMounted(fetchContent)

function goToDetail(id: string) {
  router.push(`/content/${id}`)
}

function getTypeLabel(type: ContentType): string {
  const labels: Record<ContentType, string> = {
    article: '文章',
    video: '视频',
    podcast: '播客'
  }
  return labels[type]
}

function getDurationLabel(item: { type: string; estimatedMinutes?: number; duration?: number }): string {
  if (item.type === 'article') {
    return `${item.estimatedMinutes || 0} 分钟`
  }
  if (item.duration) {
    const mins = Math.floor(item.duration / 60)
    const secs = item.duration % 60
    return secs > 0 ? `${mins}:${String(secs).padStart(2, '0')}` : `${mins} 分钟`
  }
  return ''
}
</script>

<style scoped>
.content-page {
  padding: var(--space-6);
  max-width: 1200px;
  margin: 0 auto;
}

/* ── Filter Bar ──────────────────────────────────────────────── */
.filter-bar {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  margin-bottom: var(--space-6);
  padding: var(--space-4);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.filter-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.filter-label {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-text-muted);
  white-space: nowrap;
  min-width: 36px;
}

.filter-pills {
  display: flex;
  gap: var(--space-1);
  flex-wrap: wrap;
}

.pill-btn {
  display: inline-flex;
  align-items: center;
  padding: var(--space-1) var(--space-3);
  font-size: 0.8125rem;
  font-weight: 500;
  font-family: var(--font-sans);
  color: var(--color-text-muted);
  background: var(--color-surface-muted);
  border: 1px solid var(--color-border);
  border-radius: 999px;
  cursor: pointer;
  transition: all 0.16s ease;
  white-space: nowrap;
}

.pill-btn:hover {
  background: var(--color-surface);
  color: var(--color-text);
  border-color: var(--color-border-strong);
}

.pill-btn.active {
  background: var(--color-primary);
  color: var(--color-primary-foreground);
  border-color: var(--color-primary);
}

/* Difficulty pill colors */
.pill-btn.difficulty-pill.diff-A1.active,
.pill-btn.difficulty-pill.diff-A2.active {
  background: var(--color-success-600);
  border-color: var(--color-success-600);
}

.pill-btn.difficulty-pill.diff-B1.active,
.pill-btn.difficulty-pill.diff-B2.active {
  background: #d97706;
  border-color: #d97706;
}

.pill-btn.difficulty-pill.diff-C1.active,
.pill-btn.difficulty-pill.diff-C2.active {
  background: var(--color-danger-600);
  border-color: var(--color-danger-600);
}

/* ── Content Grid ────────────────────────────────────────────── */
.content-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: var(--space-4);
}

.card-skeleton {
  background: var(--color-surface);
  border-radius: var(--radius-md);
  overflow: hidden;
}

/* ── Content Card ────────────────────────────────────────────── */
.content-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
  cursor: pointer;
  transition: border-color 0.16s ease, box-shadow 0.16s ease, transform 0.16s ease;
}

.content-card:hover {
  border-color: var(--color-border-strong);
  box-shadow: var(--shadow-md);
  transform: translateY(-2px);
}

/* Card Cover */
.card-cover {
  position: relative;
  width: 100%;
  height: 180px;
  overflow: hidden;
}

.card-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.content-card:hover .card-cover img {
  transform: scale(1.03);
}

.cover-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.placeholder-article {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: rgba(255, 255, 255, 0.7);
}

.placeholder-video {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: rgba(255, 255, 255, 0.7);
}

.placeholder-podcast {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  color: rgba(255, 255, 255, 0.7);
}

/* Type Badge */
.type-badge {
  position: absolute;
  top: var(--space-3);
  left: var(--space-3);
  padding: 2px 10px;
  font-size: 0.6875rem;
  font-weight: 700;
  border-radius: var(--radius-sm);
  letter-spacing: 0.02em;
}

.badge-article {
  background: rgba(99, 102, 241, 0.9);
  color: #ffffff;
}

.badge-video {
  background: rgba(239, 68, 68, 0.9);
  color: #ffffff;
}

.badge-podcast {
  background: rgba(59, 130, 246, 0.9);
  color: #ffffff;
}

/* Card Body */
.card-body {
  padding: var(--space-4);
}

.card-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text);
  margin: 0 0 var(--space-2);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  font-family: var(--font-sans);
}

.card-meta {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-2);
}

.meta-source {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.meta-difficulty {
  display: inline-flex;
  align-items: center;
  padding: 1px 6px;
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

.card-summary {
  font-size: 0.8125rem;
  color: var(--color-text-muted);
  line-height: 1.5;
  margin: 0 0 var(--space-3);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  font-family: var(--font-sans);
}

.card-footer {
  display: flex;
  align-items: center;
  gap: var(--space-4);
}

.footer-stat {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.footer-stat svg {
  flex-shrink: 0;
  opacity: 0.7;
}

/* ── Responsive ──────────────────────────────────────────────── */
@media (max-width: 768px) {
  .content-page {
    padding: var(--space-4);
  }

  .content-grid {
    grid-template-columns: 1fr;
  }

  .filter-bar {
    gap: var(--space-2);
    padding: var(--space-3);
  }

  .filter-row {
    flex-wrap: wrap;
  }
}

@media (max-width: 480px) {
  .card-cover {
    height: 150px;
  }
}
</style>
