<template>
  <div class="materials-page">
    <!-- Page Header with view tabs -->
    <div class="page-header-block">
      <PageHeader title="素材库" subtitle="文章 · 视频 · 播客，全方位沉浸输入" />

      <!-- 三大视图 Tab：全部 / 沉浸式阅读 / 精听训练 -->
      <div class="view-tabs">
        <button
          v-for="v in viewModes"
          :key="v.key"
          :class="['view-tab', { active: activeView === v.key }]"
          @click="switchView(v.key)"
        >
          <span class="view-tab-icon" v-html="v.icon" />
          <span class="view-tab-label">{{ v.label }}</span>
        </button>
      </div>
    </div>

    <!-- Filter Bar -->
    <section class="filter-bar">
      <!-- Type Tabs (in 全部视图时可筛选类型；阅读/精听视图锁定 type) -->
      <div class="filter-row">
        <BaseTabs
          v-model="selectedType"
          :tabs="effectiveTypeTabs"
        />
        <span v-if="activeView !== 'all'" class="filter-hint">
          {{ activeView === 'reading' ? '沉浸式阅读：文章类素材' : '精听训练：音频 / 视频类素材' }}
        </span>
      </div>

      <!-- Full-text Search -->
      <div class="filter-row">
        <span class="filter-label">搜索</span>
        <div class="search-input-wrap">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            v-model="searchKeyword"
            type="text"
            class="search-input"
            :placeholder="searchPlaceholder"
            @input="onSearchInput"
            @keyup.enter="triggerSearch"
          />
          <button
            v-if="searchKeyword"
            class="search-clear"
            aria-label="清空"
            @click="clearSearch"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
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
      v-else-if="visibleItems.length === 0"
      :title="emptyTitle"
      :description="emptyDescription"
      icon="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
    />

    <!-- Content Grouped by Source (each group has its own pagination) -->
    <section v-else class="content-sections">
      <div class="bulk-toggle-row">
        <button class="bulk-toggle-btn" type="button" @click="expandAll">全部展开</button>
        <button class="bulk-toggle-btn" type="button" @click="collapseAll">全部折叠</button>
      </div>
      <div v-for="[source, items] in groupedItems" :key="source" class="source-section" :class="{ collapsed: !isExpanded(source) }">
        <div
          class="source-header"
          @click="toggleGroup(source)"
        >
          <svg
            class="collapse-toggle"
            :class="{ open: isExpanded(source) }"
            width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"
            aria-hidden="true"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
          <h3 class="source-name">{{ source }}</h3>
          <span class="source-count">{{ items.length }} 条</span>
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
        <div v-if="isExpanded(source)" class="collapsible-body">
        <div class="content-grid">
          <article
            v-for="item in paginatedItems(source, items)"
            :key="item.id"
            class="content-card"
            :class="cardClass(item)"
            @click="goToDetail(item.id)"
          >
            <div class="card-cover" :class="`cover-${item.type}`">
              <img v-if="item.coverImage" :src="item.coverImage" :alt="item.title" referrerpolicy="no-referrer" />
              <div v-else class="cover-placeholder" :class="`placeholder-${item.type}`">
                <svg v-if="item.type === 'article'" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
                <svg v-else-if="item.type === 'video'" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <polygon points="23 7 16 12 23 17 23 7" />
                  <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                </svg>
                <svg v-else width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="23" />
                  <line x1="8" y1="23" x2="16" y2="23" />
                </svg>
              </div>

              <span :class="['type-badge', `badge-${item.type}`]">
                {{ getTypeLabel(item.type) }}
              </span>

              <!-- Mode badge overlay：阅读/精听模式下显示模式标签 -->
              <span v-if="activeView === 'reading'" class="mode-badge mode-reading">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>
                沉浸阅读
              </span>
              <span v-else-if="activeView === 'listening' && hasMedia(item)" class="mode-badge mode-listening">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                精听模式
              </span>

              <div v-if="hasMedia(item)" class="media-indicator">
                <svg v-if="item.type === 'podcast'" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
                <svg v-else-if="item.type === 'video'" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
              </div>
            </div>

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
                <span v-if="item.hasContent ?? item.content" class="footer-stat has-content">
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
        <SourcePagination
          v-if="isExpanded(source)"
          :page="getGroupPage(source)"
          :total="items.length"
          :page-size="getGroupPageSize(source)"
          :theme="getThemeForSource(source)"
          :collection="source"
          @update:page="(p: number) => setGroupPage(source, p)"
          @update:page-size="(s: number) => setGroupPageSize(source, s)"
        />
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { PageHeader, Skeleton, EmptyState, BaseTabs, SourcePagination } from '../components'
import { useContentStore } from '../stores/content'
import { crawlerApi, crawlSource as _crawlSource, crawlAllSources } from '../api/crawler'
import { useToast } from '../composables/useToast'
import { getTypeLabel, getDifficultyLabel } from '../utils/format'
import type { ContentType, ContentCategory, CEFRLevel } from '../types'

const toast = useToast()
const router = useRouter()
const content = useContentStore()

// ── 视图模式（三合一核心） ────────────────────────────────────
type ViewMode = 'all' | 'reading' | 'listening'
const activeView = ref<ViewMode>('all')
const viewModes = [
  {
    key: 'all' as ViewMode,
    label: '全部内容',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>'
  },
  {
    key: 'reading' as ViewMode,
    label: '沉浸式阅读',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>'
  },
  {
    key: 'listening' as ViewMode,
    label: '精听训练',
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>'
  }
]

function switchView(v: ViewMode) {
  activeView.value = v
  if (v === 'reading') {
    selectedType.value = 'article'
  } else if (v === 'listening') {
    // 精听：显示 podcast + video（= 非 article），用空字符串让后端筛选 mix
    selectedType.value = ''
  } else {
    selectedType.value = ''
  }
}

// 在精听模式下的类型 Tab：隐藏 article 选项
const allTypeTabs = [
  { value: '', label: '全部' },
  { value: 'article', label: '文章' },
  { value: 'video', label: '视频' },
  { value: 'podcast', label: '播客' }
]
const effectiveTypeTabs = computed(() => {
  if (activeView.value === 'reading') {
    return [{ value: 'article', label: '文章 (沉浸阅读)' }]
  }
  if (activeView.value === 'listening') {
    return [
      { value: '', label: '全部音频/视频' },
      { value: 'video', label: '视频' },
      { value: 'podcast', label: '播客' }
    ]
  }
  return allTypeTabs
})

const searchPlaceholder = computed(() => {
  if (activeView.value === 'reading') return '搜索文章标题/正文…'
  if (activeView.value === 'listening') return '搜索听力素材：TED、播客、剧集…'
  return '标题/摘要/正文全文搜索...'
})

const emptyTitle = computed(() => {
  if (activeView.value === 'reading') return '暂无文章素材'
  if (activeView.value === 'listening') return '暂无听力素材'
  return '暂无内容'
})
const emptyDescription = computed(() => {
  if (activeView.value === 'reading') return '试试调整筛选条件，或点击「一键爬取」获取最新文章'
  if (activeView.value === 'listening') return '试试调整筛选条件，或点击「一键爬取」获取最新音频/视频'
  return '试试调整筛选条件，或点击上方「一键爬取」获取最新内容'
})

function cardClass(item: any): Record<string, boolean> {
  return {
    'is-reading-mode': activeView.value === 'reading',
    'is-listening-mode': activeView.value === 'listening',
    'has-media': hasMedia(item)
  }
}

// ── 选中内容类型（受视图影响） ──────────────────────────────
const selectedType = ref('')
const selectedCategory = ref('')
const selectedDifficulty = ref<CEFRLevel | ''>('')
const isCrawling = ref(false)
const selectedSourceId = ref('')
const sourceDropdownOpen = ref(false)
const sourceSearchQuery = ref('')
const sourceActiveId = ref('')
const sourceDropdownRef = ref<HTMLElement | null>(null)

const selectedSourceLabel = computed(() => {
  if (!selectedSourceId.value) return ''
  const found = crawlerSources.value.find((s: any) => s.id === selectedSourceId.value)
  return found ? `${found.name} (${found.type})` : ''
})

const searchKeyword = ref('')
let searchTimer: ReturnType<typeof setTimeout> | null = null
function onSearchInput() {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => fetchContent(), 350)
}
function triggerSearch() {
  if (searchTimer) clearTimeout(searchTimer)
  fetchContent()
}
function clearSearch() {
  searchKeyword.value = ''
  fetchContent()
}

const filteredSourceOptions = computed(() => {
  if (!sourceSearchQuery.value.trim()) return crawlerSources.value
  const q = sourceSearchQuery.value.toLowerCase()
  return crawlerSources.value.filter((s: any) =>
    s.name.toLowerCase().includes(q) || s.type.toLowerCase().includes(q)
  )
})

function selectSourceOption(s: any) {
  selectedSourceId.value = s.id
  sourceDropdownOpen.value = false
  sourceSearchQuery.value = ''
  crawlOne()
}

function closeSourceDropdown() {
  sourceDropdownOpen.value = false
  sourceSearchQuery.value = ''
}

function handleClickOutside(e: MouseEvent) {
  if (sourceDropdownRef.value && !sourceDropdownRef.value.contains(e.target as Node)) {
    closeSourceDropdown()
  }
}

onMounted(() => {
  loadCollapseState()
  fetchContent()
  loadCrawlerSources()
  document.addEventListener('click', handleClickOutside)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
})

const crawlerSources = ref<any[]>([])

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

function collectionKey(source: string): string {
  if (!source) return '其他'
  let s = source.trim()
  if (/^SNL[\s\.\:：]/i.test(s)) return 'SNL'
  s = s.replace(
    /(\s+(?:P|S|E)\d{1,3}|\s+(?:Part|Ep|Episode|Ep\.|Pt\.?)\s*\d+)\s*$/i,
    '',
  ).trim()
  return s || source
}

// ── 根据视图模式再过滤：精听模式只保留 podcast/video ──
const itemsByView = computed(() => {
  const items = content.items || []
  if (activeView.value === 'listening') {
    return items.filter((i: any) => i.type === 'podcast' || i.type === 'video')
  }
  return items
})

// 过滤后“可见”的总数（给 empty state 判断用）
const visibleItems = computed(() => Array.from(groupedItems.value.values()).flat())

const groupedItems = computed(() => {
  const map = new Map<string, any[]>()
  for (const item of itemsByView.value) {
    const source = collectionKey(item.source || '')
    if (!map.has(source)) map.set(source, [])
    map.get(source)!.push(item)
  }
  const seasonOrder = (title: string): number => {
    const m = title.match(/第([一二三四五六七八九十百千]+)季|S(\d+)/i)
    if (!m) return Infinity
    const raw = m[1] ?? m[2]
    const cnMap: Record<string, number> = { 一:1,二:2,三:3,四:4,五:5,六:6,七:7,八:8,九:9,十:10,百:100,千:1000 }
    if (/^\d+$/.test(raw)) return Number(raw)
    let n = 0
    for (const ch of raw) n = (n + (cnMap[ch] ?? 0)) * 10
    return Math.floor(n / 10)
  }
  for (const [, arr] of map) {
    arr.sort((a, b) => seasonOrder(a.title || '') - seasonOrder(b.title || '')
      || (a.title || '').localeCompare(b.title || '', 'zh-CN', { numeric: true }))
  }
  return map
})

const DEFAULT_PAGE_SIZE = 12
const groupPages = reactive<Record<string, { page: number; pageSize: number }>>({})

function groupState(source: string) {
  if (!groupPages[source]) {
    groupPages[source] = { page: 1, pageSize: DEFAULT_PAGE_SIZE }
  }
  return groupPages[source]
}
function getGroupPage(source: string): number { return groupState(source).page }
function getGroupPageSize(source: string): number { return groupState(source).pageSize }
function setGroupPage(source: string, page: number) {
  const cur = groupState(source)
  groupPages[source] = { page, pageSize: cur.pageSize }
}
function setGroupPageSize(source: string, size: number) {
  const cur = groupState(source)
  const maxPage = Math.max(1, Math.ceil((groupedItems.value.get(source)?.length ?? 0) / size))
  const page = cur.page > maxPage ? maxPage : cur.page
  groupPages[source] = { page, pageSize: size }
}
function paginatedItems(source: string, items: any[]): any[] {
  const st = groupState(source)
  const start = (st.page - 1) * st.pageSize
  return items.slice(start, start + st.pageSize)
}

const expandedGroups = ref<Record<string, boolean>>({})
const COLLAPSE_KEY = 'wordflow.materials.expandedGroups'
const AUTO_EXPAND_FIRST = 3

function loadCollapseState() {
  try {
    const raw = localStorage.getItem(COLLAPSE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      const allCollapsed = Object.values(parsed).every((v: any) => v === false)
      if (allCollapsed && Object.keys(parsed).length > 0) {
        localStorage.removeItem(COLLAPSE_KEY)
        return
      }
      expandedGroups.value = { ...parsed }
    }
  } catch { /* ignore */ }
}

const expandedMap = computed<Record<string, boolean>>(() => {
  const result: Record<string, boolean> = {}
  const keys = Array.from(groupedItems.value.keys())
  const stored = expandedGroups.value
  for (const source of keys) {
    const hasStored = Object.prototype.hasOwnProperty.call(stored, source)
    result[source] = hasStored
      ? (stored[source] ?? false)
      : keys.indexOf(source) < AUTO_EXPAND_FIRST
  }
  return result
})

function isExpanded(source: string): boolean { return expandedMap.value[source] ?? false }

function toggleGroup(source: string) {
  const next = !isExpanded(source)
  expandedGroups.value = { ...expandedGroups.value, [source]: next }
  try { localStorage.setItem(COLLAPSE_KEY, JSON.stringify(expandedGroups.value)) } catch {}
}

function expandAll() {
  const next: Record<string, boolean> = {}
  for (const k of Object.keys(groupedItems.value)) next[k] = true
  expandedGroups.value = next
  try { localStorage.setItem(COLLAPSE_KEY, JSON.stringify(expandedGroups.value)) } catch {}
}
function collapseAll() {
  const next: Record<string, boolean> = {}
  for (const k of Object.keys(groupedItems.value)) next[k] = false
  expandedGroups.value = next
  try { localStorage.setItem(COLLAPSE_KEY, JSON.stringify(expandedGroups.value)) } catch {}
}

function getThemeForSource(source: string): string {
  const s = source.toLowerCase()
  if (s.includes('steve') || s.includes('harvey')) return 'steve'
  if (s.includes('ted') || s.includes('ted-ed')) return 'ted'
  if (s.includes('snl') || s.includes('saturday night')) return 'snl'
  if (s.includes('key') || s.includes('peele')) return 'key-peele'
  return 'article'
}

async function loadCrawlerSources() {
  try {
    const data = await crawlerApi.getSources()
    crawlerSources.value = Array.isArray(data) ? data : []
  } catch {
    crawlerSources.value = []
  }
}

function fetchContent() {
  content.fetchList({
    type: (selectedType.value as ContentType) || undefined,
    category: (selectedCategory.value as ContentCategory) || undefined,
    difficulty: selectedDifficulty.value || undefined,
    keyword: searchKeyword.value.trim() || undefined,
    mix: !selectedType.value,
    pageSize: 2000,
  })
}

watch([selectedType, selectedCategory, selectedDifficulty], fetchContent)

function goToDetail(id: string) {
  router.push(`/content/${id}`)
}

function getDurationLabel(item: any): string {
  if (item.type === 'article') {
    const len = item.contentLength ?? item.content?.length ?? 0
    return `${item.estimatedMinutes || Math.max(1, Math.ceil(len / 500))} 分钟`
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
.materials-page {
  padding: var(--space-6);
  max-width: 1280px;
  margin: 0 auto;
}

/* 页面头块：PageHeader + 视图模式 Tab 合并 */
.page-header-block {
  position: relative;
  margin-bottom: var(--space-4);
}

/* ── 视图模式 Tab（三合一核心 UI） ──────────────────────── */
.view-tabs {
  display: inline-flex;
  gap: var(--space-1);
  padding: 4px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 999px;
  box-shadow: var(--shadow-sm);
  margin-top: var(--space-3);
}
.view-tab {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: 8px 18px;
  font-size: 0.875rem;
  font-weight: 500;
  font-family: var(--font-sans);
  color: var(--color-text-muted);
  background: transparent;
  border: none;
  border-radius: 999px;
  cursor: pointer;
  transition: all 0.18s ease;
  white-space: nowrap;
}
.view-tab:hover {
  color: var(--color-text);
  background: var(--color-surface-muted);
}
.view-tab.active {
  background: linear-gradient(135deg, var(--color-brand-600) 0%, var(--color-brand-700) 100%);
  color: #ffffff;
  box-shadow:
    0 1px 3px rgba(0, 0, 0, 0.08),
    0 4px 10px rgba(79, 70, 229, 0.22);
}
.view-tab-icon {
  width: 16px;
  height: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  opacity: 0.85;
}
.view-tab-icon :deep(svg) {
  width: 100%;
  height: 100%;
  stroke-width: 2.2;
}
.view-tab-label {
  line-height: 1;
}

.filter-hint {
  margin-left: auto;
  font-size: 0.8125rem;
  color: var(--color-primary);
  font-weight: 600;
  padding: 4px 10px;
  background: var(--color-brand-subtle);
  border-radius: 999px;
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

.search-input-wrap {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex: 1;
  max-width: 480px;
  padding: 6px 10px 6px 12px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text-muted);
  transition: border-color 0.16s ease, box-shadow 0.16s ease;
}
.search-input-wrap:focus-within {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px var(--color-brand-subtle);
}
.search-input-wrap svg { flex-shrink: 0; }
.search-input {
  flex: 1;
  padding: 0;
  font-size: 0.8125rem;
  font-family: var(--font-sans);
  background: transparent;
  border: none;
  outline: none;
  color: var(--color-text);
  min-width: 0;
}
.search-input::placeholder { color: var(--color-text-muted); }
.search-clear {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  padding: 0;
  background: var(--color-surface-muted);
  border: none;
  border-radius: 50%;
  color: var(--color-text-muted);
  cursor: pointer;
  transition: all 0.12s ease;
}
.search-clear:hover {
  background: var(--color-border);
  color: var(--color-text);
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
.crawler-info svg { color: var(--color-primary); flex-shrink: 0; }

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
.btn-crawl:hover:not(:disabled) { background: var(--color-brand-700); }
.btn-crawl:disabled { opacity: 0.6; cursor: not-allowed; }

/* ── Custom Select Dropdown ─────────────────────────── */
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
.custom-select-trigger:hover { border-color: var(--color-primary); }
.custom-select-trigger.open {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px var(--color-brand-subtle);
}
.trigger-label { overflow: hidden; text-overflow: ellipsis; flex: 1; min-width: 0; }
.trigger-arrow { flex-shrink: 0; transition: transform 0.2s ease; color: var(--color-text-muted); }
.custom-select-trigger.open .trigger-arrow { transform: rotate(180deg); }

.custom-select-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  z-index: var(--z-dropdown);
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
.dropdown-search-wrap svg { flex-shrink: 0; }
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
.dropdown-search::placeholder { color: var(--color-text-muted); }

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
.custom-select-option.active { background: var(--color-surface-muted); }
.custom-select-option.selected {
  background: var(--color-brand-subtle);
  color: var(--color-text);
  font-weight: 600;
  box-shadow: inset 3px 0 0 var(--color-primary);
}
.option-check { flex-shrink: 0; margin-right: var(--space-1); color: var(--color-primary); }
.option-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
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

.dropdown-enter-active { transition: opacity 0.15s ease, transform 0.15s ease; }
.dropdown-leave-active { transition: opacity 0.1s ease, transform 0.1s ease; }
.dropdown-enter-from { opacity: 0; transform: translateY(-4px) scale(0.97); }
.dropdown-leave-to { opacity: 0; transform: translateY(-2px) scale(0.99); }

.spin { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* ── Source Sections ─────────────────────────────────────────── */
.content-sections {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.source-header {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: var(--space-3);
  padding-bottom: var(--space-2);
  border-bottom: 2px solid var(--color-border);
  cursor: pointer;
  user-select: none;
}
.source-header:hover { border-bottom-color: var(--color-primary); }

.collapse-toggle {
  flex-shrink: 0;
  color: var(--color-text-muted);
  transition: transform 0.18s ease;
}
.collapse-toggle.open { transform: rotate(90deg); color: var(--color-primary); }

.bulk-toggle-row {
  display: flex;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
}
.bulk-toggle-btn {
  padding: var(--space-1) var(--space-3);
  font-size: 0.8125rem;
  font-family: var(--font-sans);
  color: var(--color-text-muted);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.12s ease;
}
.bulk-toggle-btn:hover { border-color: var(--color-primary); color: var(--color-primary); }

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
.btn-mini-crawl:hover { background: var(--color-brand-subtle); }

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
/* 阅读模式下强调排版 */
.content-card.is-reading-mode {
  border-color: rgba(79, 70, 229, 0.3);
}
/* 精听模式下强调音频/视频标识 */
.content-card.is-listening-mode {
  border-color: rgba(16, 185, 129, 0.3);
}

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
.content-card:hover .card-cover img { transform: scale(1.03); }

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

/* 视图模式标签角标（右上） */
.mode-badge {
  position: absolute;
  top: var(--space-3);
  right: var(--space-3);
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  font-size: 0.75rem;
  font-weight: 700;
  border-radius: 999px;
  letter-spacing: 0.02em;
  line-height: 1.4;
  z-index: var(--z-raised);
  backdrop-filter: blur(4px);
}
.mode-badge.mode-reading {
  background: rgba(79, 70, 229, 0.95);
  color: #fff;
  box-shadow: 0 2px 6px rgba(79, 70, 229, 0.3);
}
.mode-badge.mode-listening {
  background: rgba(16, 185, 129, 0.95);
  color: #fff;
  box-shadow: 0 2px 6px rgba(16, 185, 129, 0.3);
}

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
  z-index: var(--z-raised);
}
.badge-article { background: var(--color-primary); color: var(--color-primary-foreground); }
.badge-video { background: var(--color-danger-600); color: #ffffff; }
.badge-podcast { background: var(--color-success-600); color: #ffffff; }

.card-body { padding: var(--space-4); }
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
.footer-stat.has-content { color: var(--color-primary); }
.footer-stat svg { flex-shrink: 0; opacity: 0.7; }

/* ── Responsive ──────────────────────────────────────────────── */
@media (max-width: 768px) {
  .materials-page { padding: var(--space-4); }
  .view-tabs { width: 100%; flex-direction: row; overflow-x: auto; }
  .view-tab { flex: 1; justify-content: center; }
  .content-grid { grid-template-columns: 1fr; }
  .filter-bar { gap: var(--space-2); padding: var(--space-3); }
  .filter-row { flex-wrap: wrap; }
  .crawler-bar { flex-direction: column; align-items: stretch; }
  .crawler-actions { justify-content: stretch; }
  .btn-crawl { flex: 1; justify-content: center; }
  .custom-select { flex: 1; }
}
@media (max-width: 480px) {
  .card-cover { height: 150px; }
  .source-list { display: none; }
}
</style>
