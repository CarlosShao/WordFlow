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

    <!-- Crawler Actions Bar -->
    <section class="crawler-bar">
      <div class="crawler-info">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2a10 10 0 1 0 10 10H12V2z" /><path d="M12 2a10 10 0 0 1 10 10" />
          <circle cx="12" cy="12" r="3" />
        </svg>
        <span>已配置 {{ crawlerSources.length }} 个来源</span>
        <span class="source-list">
          <span v-for="s in crawlerSources.slice(0, 6)" :key="s.id" class="source-tag">{{ s.name }}</span>
          <span v-if="crawlerSources.length > 6" class="source-more">+{{ crawlerSources.length - 6 }}</span>
        </span>
      </div>
      <div class="crawler-actions">
        <button
          class="btn-crawl"
          :disabled="isCrawling"
          @click="crawlAll"
        >
          <svg v-if="!isCrawling" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
          <svg v-else class="spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 12a9 9 0 11-6.219-8.56" />
          </svg>
          {{ isCrawling ? '爬取中...' : '一键爬取全部' }}
        </button>
        <!-- Custom themed dropdown replacing native select -->
        <div class="custom-select" ref="sourceDropdownRef">
          <button
            type="button"
            class="custom-select-trigger"
            :class="{ open: sourceDropdownOpen }"
            @click.stop="sourceDropdownOpen = !sourceDropdownOpen"
          >
            <span class="trigger-label">{{ selectedSourceLabel || '选择来源单独爬取' }}</span>
            <svg class="trigger-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          <Transition name="dropdown">
            <div v-if="sourceDropdownOpen" class="custom-select-dropdown">
              <div class="dropdown-search-wrap">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                <input
                  v-model="sourceSearchQuery"
                  class="dropdown-search"
                  placeholder="搜索来源..."
                  @click.stop
                  @input="sourceDropdownOpen = true"
                />
              </div>
              <div class="dropdown-options">
                <div
                  v-for="s in filteredSourceOptions"
                  :key="s.id"
                  class="custom-select-option"
                  :class="{ selected: selectedSourceId === s.id, active: sourceActiveId === s.id }"
                  @mouseenter="sourceActiveId = s.id"
                  @click.stop="selectSourceOption(s)"
                >
                  <span class="option-name">{{ s.name }}</span>
                  <svg v-if="selectedSourceId === s.id" class="option-check" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  <span class="option-type">{{ s.type }}</span>
                </div>
                <div v-if="filteredSourceOptions.length === 0" class="dropdown-empty">无匹配结果</div>
              </div>
            </div>
          </Transition>
        </div>
      </div>
    </section>

    <!-- Loading State -->
    <section v-if="content.loading && !groupedItems.size" class="content-grid">
      <div v-for="i in 6" :key="i" class="card-skeleton">
        <Skeleton variant="card" />
      </div>
    </section>

    <!-- Empty State -->
    <EmptyState
      v-else-if="(content.items || []).length === 0"
      title="暂无内容"
      description="试试调整筛选条件，或点击上方「一键爬取」获取最新内容"
      icon="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
    />

    <!-- Content Grouped by Source -->
    <section v-else class="content-sections">
      <div v-for="[source, items] in groupedItems" :key="source" class="source-section">
        <div class="source-header">
          <h3 class="source-name">{{ source }}</h3>
          <span class="source-count">{{ items.length }} 篇</span>
          <button
            v-if="getSourceCrawlId(source)"
            class="btn-mini-crawl"
            @click.stop="crawlBySource(source)"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
            </svg>
            爬取此来源
          </button>
        </div>
        <div class="content-grid">
          <article
            v-for="item in items"
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

              <!-- Audio/Video indicator overlay for podcast/video with media URL -->
              <div v-if="hasMedia(item)" class="media-indicator">
                <svg v-if="item.type === 'podcast'" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                <svg v-else-if="item.type === 'video'" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
              </div>
            </div>

            <!-- Card Content -->
            <div class="card-body">
              <h3 class="card-title">{{ item.title }}</h3>
              <div class="card-meta">
                <span :class="['meta-difficulty', `difficulty-${item.difficulty}`]">
                  {{ getDifficultyLabel(item.difficulty) }}
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
                <span v-if="item.content" class="footer-stat has-content">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                  </svg>
                  原文
                </span>
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { PageHeader, Skeleton, EmptyState, BaseTabs } from '../components'
import { useContentStore } from '../stores/content'
import { crawlerApi, crawlSource as _crawlSource, crawlAllSources } from '../api/crawler'
import { useToast } from '../composables/useToast'
import type { ContentType, ContentCategory, CEFRLevel } from '../types'

const toast = useToast()

const router = useRouter()
const content = useContentStore()

const selectedType = ref('')
const selectedCategory = ref('')
const selectedDifficulty = ref<CEFRLevel | ''>('')
const isCrawling = ref(false)
const selectedSourceId = ref('')
const sourceDropdownOpen = ref(false)
const sourceSearchQuery = ref('')
const sourceActiveId = ref('')
const sourceDropdownRef = ref<HTMLElement | null>(null)

// Computed label for the custom select trigger
const selectedSourceLabel = computed(() => {
  if (!selectedSourceId.value) return ''
  const found = crawlerSources.value.find((s: any) => s.id === selectedSourceId.value)
  return found ? `${found.name} (${found.type})` : ''
})

// Filtered options for search
const filteredSourceOptions = computed(() => {
  if (!sourceSearchQuery.value.trim()) return crawlerSources.value
  const q = sourceSearchQuery.value.toLowerCase()
  return crawlerSources.value.filter((s: any) =>
    s.name.toLowerCase().includes(q) || s.type.toLowerCase().includes(q)
  )
})

function toggleSourceDropdown() {
  sourceDropdownOpen.value = !sourceDropdownOpen.value
}

function selectSourceOption(s: any) {
  selectedSourceId.value = s.id
  sourceDropdownOpen.value = false
  sourceSearchQuery.value = ''
  // Trigger crawl
  crawlOne()
}

function closeSourceDropdown() {
  sourceDropdownOpen.value = false
  sourceSearchQuery.value = ''
}

// Click outside to close
function handleClickOutside(e: MouseEvent) {
  if (sourceDropdownRef.value && !sourceDropdownRef.value.contains(e.target as Node)) {
    closeSourceDropdown()
  }
}

onMounted(() => {
  fetchContent()
  loadCrawlerSources()
  document.addEventListener('click', handleClickOutside)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
})

// Crawler sources (loaded on mount)
const crawlerSources = ref<any[]>([])

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

// Group content items by source
const groupedItems = computed(() => {
  const items = content.items || []
  const map = new Map<string, any[]>()
  for (const item of items) {
    const source = item.source || '其他'
    if (!map.has(source)) map.set(source, [])
    map.get(source)!.push(item)
  }
  return map
})

async function loadCrawlerSources() {
  try {
    const data = await crawlerApi.getSources()
    crawlerSources.value = Array.isArray(data) ? data : []
  } catch {
    // Fallback
    crawlerSources.value = []
  }
}

function fetchContent() {
  content.fetchList({
    type: (selectedType.value as ContentType) || undefined,
    category: (selectedCategory.value as ContentCategory) || undefined,
    difficulty: selectedDifficulty.value || undefined,
    // When "全部" is selected, request mixed types
    mix: !selectedType.value,
  })
}

watch([selectedType, selectedCategory, selectedDifficulty], fetchContent)

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

function getDifficultyLabel(difficulty?: string): string {
  if (!difficulty) return ''
  const map: Record<string, string> = {
    BEGINNER: 'A1 入门', ELEMENTARY: 'A2 基础',
    INTERMEDIATE: 'B1 中级', UPPER_INTERMEDIATE: 'B2 中高级',
    ADVANCED: 'C1 高级', PROFICIENT: 'C2 精通',
  }
  return map[difficulty] || difficulty
}

function getDurationLabel(item: any): string {
  if (item.type === 'article') {
    return `${item.estimatedMinutes || Math.ceil((item.content?.length || 0) / 500)} 分钟`
  }
  if (item.duration) {
    const mins = Math.floor(item.duration / 60)
    const secs = item.duration % 60
    return secs > 0 ? `${mins}:${String(secs).padStart(2, '0')}` : `${mins} 分钟`
  }
  return ''
}

function hasMedia(item: any): boolean {
  return !!(item.audioUrl || item.videoUrl)
}

function getSourceCrawlId(sourceName: string): string | null {
  const found = crawlerSources.value.find(s => s.name === sourceName)
  return found?.id || null
}

async function crawlAll() {
  isCrawling.value = true
  try {
    const data = await crawlAllSources() as unknown as {
      totalInserted?: number
      failedCount?: number
      message?: string
    }
    const inserted = data.totalInserted ?? 0
    const failed = data.failedCount ?? 0
    if (failed > 0) {
      toast.warning(`爬取完成：新增 ${inserted} 条，${failed} 个来源失败（详见后端日志）`)
    } else {
      toast.success(`爬取完成：成功新增 ${inserted} 条内容`)
    }
    await fetchContent()
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    toast.error(`爬取失败：${msg}`)
  } finally {
    isCrawling.value = false
  }
}

async function crawlOne() {
  if (!selectedSourceId.value) {
    toast.warning('请先选择一个来源')
    return
  }
  isCrawling.value = true
  try {
    const data = await _crawlSource(selectedSourceId.value) as unknown as {
      inserted?: number
      status?: string
      error?: string
      sourceName?: string
    }
    if (data.status === 'error') {
      toast.error(`「${data.sourceName ?? '来源'}」爬取失败：${data.error ?? '未知错误'}`)
    } else {
      toast.success(`「${data.sourceName ?? '来源'}」爬取完成：新增 ${data.inserted ?? 0} 条`)
    }
    await fetchContent()
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    toast.error(`爬取失败：${msg}`)
  } finally {
    isCrawling.value = false
    selectedSourceId.value = ''
  }
}

async function crawlBySource(sourceName: string) {
  const id = getSourceCrawlId(sourceName)
  if (!id) {
    toast.warning(`未找到来源「${sourceName}」的爬虫配置`)
    return
  }
  isCrawling.value = true
  try {
    const data = await _crawlSource(id) as unknown as {
      inserted?: number
      status?: string
      error?: string
      sourceName?: string
    }
    if (data.status === 'error') {
      toast.error(`「${data.sourceName ?? sourceName}」爬取失败：${data.error ?? '未知错误'}`)
    } else {
      toast.success(`「${data.sourceName ?? sourceName}」爬取完成：新增 ${data.inserted ?? 0} 条`)
    }
    await fetchContent()
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    toast.error(`爬取失败：${msg}`)
  } finally {
    isCrawling.value = false
  }
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
  margin-bottom: var(--space-4);
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

.pill-btn.difficulty-pill.diff-A1.active,
.pill-btn.difficulty-pill.diff-A2.active {
  background: var(--color-success-600);
  border-color: var(--color-success-600);
}

.pill-btn.difficulty-pill.diff-B1.active,
.pill-btn.difficulty-pill.diff-B2.active {
  background: var(--color-brand-700);
  border-color: var(--color-brand-700);
}

.pill-btn.difficulty-pill.diff-C1.active,
.pill-btn.difficulty-pill.diff-C2.active {
  background: var(--color-danger-600);
  border-color: var(--color-danger-600);
}

/* ── Crawler Actions Bar ─────────────────────────────────────── */
.crawler-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  margin-bottom: var(--space-4);
  padding: var(--space-3) var(--space-4);
  background: var(--color-brand-subtle);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  flex-wrap: wrap;
}

.crawler-info {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  color: var(--color-text-muted);
  font-size: 0.8125rem;
}

.crawler-info svg {
  color: var(--color-primary);
  flex-shrink: 0;
}

.source-list {
  display: flex;
  gap: var(--space-1);
  align-items: center;
}

.source-tag {
  padding: 4px 10px;
  font-size: 0.875rem;
  background: var(--color-surface);
  border-radius: 999px;
  color: var(--color-primary);
  border: 1px solid var(--color-border);
  line-height: 1.4;
}

.source-more {
  font-size: 0.75rem;
  color: var(--color-primary);
  font-weight: 600;
}

.crawler-actions {
  display: flex;
  gap: var(--space-2);
  align-items: center;
}

.btn-crawl {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-2) var(--space-4);
  font-size: 0.8125rem;
  font-weight: 600;
  font-family: var(--font-sans);
  color: var(--color-primary-foreground);
  background: var(--color-primary);
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.16s ease;
}

.btn-crawl:hover:not(:disabled) {
  background: var(--color-brand-700);
}

.btn-crawl:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* ── Custom Select Dropdown (themed) ─────────────────────────── */
.custom-select {
  position: relative;
  min-width: 200px;
}

.custom-select-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  width: 100%;
  padding: var(--space-2) var(--space-3);
  font-size: 0.8125rem;
  font-family: var(--font-sans);
  color: var(--color-text);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: border-color 0.16s ease, box-shadow 0.16s ease;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.custom-select-trigger:hover {
  border-color: var(--color-primary);
}

.custom-select-trigger.open {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px var(--color-brand-subtle);
}

.trigger-label {
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  min-width: 0;
}

.trigger-arrow {
  flex-shrink: 0;
  transition: transform 0.2s ease;
  color: var(--color-text-muted);
}

.custom-select-trigger.open .trigger-arrow {
  transform: rotate(180deg);
}

.custom-select-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  z-index: 50;
  display: flex;
  flex-direction: column;
  background: var(--color-surface);
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-md);
  box-shadow:
    0 4px 6px -1px rgba(0, 0, 0, 0.08),
    0 10px 15px -3px rgba(0, 0, 0, 0.06);
  overflow: hidden;
  max-height: 320px;
}

.dropdown-search-wrap {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  border-bottom: 1px solid var(--color-border);
  color: var(--color-text-muted);
}

.dropdown-search-wrap svg {
  flex-shrink: 0;
}

.dropdown-search {
  width: 100%;
  padding: 4px 0;
  font-size: 0.8125rem;
  font-family: var(--font-sans);
  background: transparent;
  border: none;
  outline: none;
  color: var(--color-text);
}

.dropdown-search::placeholder {
  color: var(--color-text-muted);
}

.dropdown-options {
  overflow-y: auto;
  padding: var(--space-1) 0;
}

.custom-select-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  font-size: 0.8125rem;
  font-family: var(--font-sans);
  cursor: pointer;
  transition: background-color 0.12s ease;
  color: var(--color-text);
}

.custom-select-option:hover,
.custom-select-option.active {
  background: var(--color-surface-muted);
}

.custom-select-option.selected {
  background: var(--color-brand-subtle);
  color: var(--color-text);
  font-weight: 600;
  box-shadow: inset 3px 0 0 var(--color-primary);
}

.option-check {
  flex-shrink: 0;
  margin-right: var(--space-1);
  color: var(--color-primary);
}

.option-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}
.option-type {
  font-size: 0.875rem;
  font-weight: 500;
  padding: 4px 10px;
  border-radius: 999px;
  background: var(--color-surface-subtle);
  color: var(--color-text-muted);
  line-height: 1.4;
  white-space: nowrap;
  flex-shrink: 0;
  margin-left: auto;
}

.dropdown-empty {
  padding: var(--space-4) var(--space-3);
  text-align: center;
  font-size: 0.8125rem;
  color: var(--color-text-muted);
}

/* Dropdown transition */
.dropdown-enter-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.dropdown-leave-active {
  transition: opacity 0.1s ease, transform 0.1s ease;
}
.dropdown-enter-from {
  opacity: 0;
  transform: translateY(-4px) scale(0.97);
}
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-2px) scale(0.99);
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* ── Source Sections ─────────────────────────────────────────── */
.content-sections {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.source-section {
  /* nothing special */
}

.source-header {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: var(--space-3);
  padding-bottom: var(--space-2);
  border-bottom: 2px solid var(--color-border);
}

.source-name {
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--color-text);
  margin: 0;
  font-family: var(--font-serif);
}

.source-count {
  font-size: 0.875rem;
  color: var(--color-text-muted);
  background: var(--color-surface-muted);
  padding: 5px 12px;
  border-radius: 999px;
  line-height: 1.4;
}

.btn-mini-crawl {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-left: auto;
  padding: 6px 14px;
  font-size: 0.875rem;
  font-family: var(--font-sans);
  color: var(--color-primary);
  background: transparent;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.16s ease;
  line-height: 1.4;
}

.btn-mini-crawl:hover {
  background: var(--color-brand-subtle);
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
  background: linear-gradient(135deg, var(--color-brand-600) 0%, var(--color-brand-800) 100%);
  color: rgba(255, 255, 255, 0.7);
}

.placeholder-video {
  background: linear-gradient(135deg, var(--color-danger-600) 0%, var(--color-danger-700) 100%);
  color: rgba(255, 255, 255, 0.7);
}

.placeholder-podcast {
  background: linear-gradient(135deg, var(--color-success-600) 0%, var(--color-success-700) 100%);
  color: rgba(255, 255, 255, 0.7);
}

/* Media overlay indicator */
.media-indicator {
  position: absolute;
  bottom: var(--space-3);
  right: var(--space-3);
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.55);
  border-radius: 50%;
  color: white;
  backdrop-filter: blur(4px);
}

/* Type Badge */
.type-badge {
  position: absolute;
  top: var(--space-3);
  left: var(--space-3);
  padding: 5px 12px;
  font-size: 0.875rem;
  font-weight: 700;
  border-radius: var(--radius-sm);
  letter-spacing: 0.02em;
  line-height: 1.4;
  z-index: 2;
}

.badge-article {
  background: var(--color-primary);
  color: var(--color-primary-foreground);
}

.badge-video {
  background: var(--color-danger-600);
  color: #ffffff;
}

.badge-podcast {
  background: var(--color-success-600);
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

.meta-difficulty {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  font-size: 0.875rem;
  font-weight: 600;
  border-radius: var(--radius-sm);
  line-height: 1.4;
}

.difficulty-A1 { background: var(--color-success-50); color: var(--color-success-700); }
.difficulty-A2 { background: var(--color-success-50); color: var(--color-success-600); }
.difficulty-B1 { background: var(--color-brand-subtle); color: var(--color-brand-700); }
.difficulty-B2 { background: var(--color-brand-subtle); color: var(--color-brand-700); }
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
  font-size: 0.875rem;
  color: var(--color-text-muted);
  line-height: 1.4;
}

.footer-stat.has-content {
  color: var(--color-primary);
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

  .crawler-bar {
    flex-direction: column;
    align-items: stretch;
  }

  .crawler-actions {
    justify-content: stretch;
  }

  .btn-crawl {
    flex: 1;
    justify-content: center;
  }

  .custom-select {
    flex: 1;
  }
}

@media (max-width: 480px) {
  .card-cover {
    height: 150px;
  }

  .source-list {
    display: none;
  }
}
</style>
