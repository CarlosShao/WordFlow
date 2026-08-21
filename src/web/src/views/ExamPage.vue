<template>
  <div class="exam-page">
    <PageHeader title="真题书架" subtitle="像翻开一本本实体书一样刷题" />

    <!-- Data source filter -->
    <section class="source-section">
      <div class="source-group">
        <span class="source-label">数据来源</span>
        <button
          v-for="ds in availableSources"
          :key="ds.key"
          :class="['source-btn', { active: dataSource === ds.key }]"
          @click="switchDataSource(ds.key)"
        >
          <span class="source-dot" :class="'dot-' + ds.key"></span>
          {{ ds.label }}
          <span v-if="ds.count !== null" class="source-count">{{ ds.count }}</span>
        </button>
      </div>
    </section>

    <!-- Category filter -->
    <section class="filters-section">
      <div class="filter-group">
        <button
          v-for="cat in categories"
          :key="cat"
          :class="['filter-btn', { active: category === cat }]"
          @click="switchCategory(cat)"
        >
          <span class="filter-btn-icon">
            <svg v-if="cat === 'TOEFL'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
            <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 2v7.31"/><path d="M14 9.3V1.99"/><path d="M8.5 2h7"/><path d="M14 9.3a6.5 6.5 0 11-4 0"/><path d="M5.52 16h12.96"/></svg>
          </span>
          {{ catLabel(cat) }}
        </button>
      </div>
      <div class="filter-summary">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
        {{ books.length }} 套真题 · {{ totalQuestions }} 道题
      </div>
    </section>

    <section v-if="loading" class="loading-area">
      <div v-if="isCurated" class="curated-grid">
        <div v-for="i in 6" :key="i" class="curated-card skeleton"></div>
      </div>
      <div v-else class="shelf">
        <div class="shelf-books">
          <div v-for="i in 6" :key="i" class="book-card skeleton"></div>
        </div>
        <div class="shelf-board"></div>
      </div>
    </section>

    <EmptyState v-else-if="books.length === 0" title="书架空空如也" description="真题数据尚未导入，稍后再来看看吧" />

    <!-- ============ 精选题库布局 ============ -->
    <section v-else-if="isCurated" class="curated-area">
      <!-- 真题区 -->
      <div v-if="realExamBooks.length > 0" class="curated-section">
        <h3 class="curated-section-title">
          <span class="section-icon">📝</span>
          真题题库
          <span class="section-count">{{ realExamBooks.length }} 本</span>
        </h3>
        <div class="curated-grid">
          <article
            v-for="book in realExamBooks"
            :key="book.id"
            class="curated-card"
            @click="openBook(book)"
          >
            <div class="curated-card-header" :class="curatedTheme(book)">
              <span class="curated-badge">{{ curatedBadge(book) }}</span>
              <span class="curated-cat">{{ catLabel(category) }}</span>
            </div>
            <div class="curated-card-body">
              <h4 class="curated-title">{{ book.title }}</h4>
              <p class="curated-desc">{{ book.description || '高质量真题数据' }}</p>
              <div class="curated-stats">
                <span class="stat-item">
                  <span class="stat-num">{{ book.sectionCount }}</span>
                  <span class="stat-label">篇</span>
                </span>
                <span class="stat-divider">·</span>
                <span class="stat-item">
                  <span class="stat-num">{{ book.questionCount }}</span>
                  <span class="stat-label">题</span>
                </span>
              </div>
            </div>
          </article>
        </div>
      </div>

      <!-- 模考区 -->
      <div v-if="mockExamBooks.length > 0" class="curated-section">
        <h3 class="curated-section-title">
          <span class="section-icon">🎯</span>
          模考套题
          <span class="section-count">{{ mockExamBooks.length }} 套</span>
        </h3>
        <div class="curated-grid">
          <article
            v-for="book in mockExamBooks"
            :key="book.id"
            class="curated-card mock-card"
            @click="openBook(book)"
          >
            <div class="curated-card-header mock-header">
              <span class="curated-badge">MOCK</span>
              <span class="curated-cat">{{ catLabel(category) }}</span>
            </div>
            <div class="curated-card-body">
              <h4 class="curated-title">{{ book.title }}</h4>
              <p class="curated-desc">{{ book.description || '模考套题' }}</p>
              <div class="curated-stats">
                <span class="stat-item">
                  <span class="stat-num">{{ book.sectionCount }}</span>
                  <span class="stat-label">套</span>
                </span>
                <span class="stat-divider">·</span>
                <span class="stat-item">
                  <span class="stat-num">{{ book.questionCount }}</span>
                  <span class="stat-label">题</span>
                </span>
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>

    <!-- ============ 网盘筛选布局（原书架） ============ -->
    <section v-else class="shelves">
      <div class="shelf-section">
        <div v-if="category === 'IELTS'" class="shelf-section-title">学术类 · A</div>
        <div v-for="(shelf, sIdx) in shelfRowsA" :key="'A' + sIdx" class="shelf">
          <div class="shelf-books">
            <article
              v-for="book in shelf"
              :key="book.id"
              class="book-card"
              :class="bookTheme(book)"
              :style="bookTilt(book)"
              @click="openBook(book)"
              :title="book.title"
            >
              <div class="book-spine">
                <span class="spine-title">{{ spineTitle(book) }}</span>
                <div class="spine-lines"><i></i><i></i><i></i><i></i><i></i></div>
              </div>
              <div class="book-face">
                <div class="cover-band"><span class="brand-label">{{ brandLabel(book) }}</span></div>
                <div class="cover-center">
                  <div class="cover-volume" :class="{ 'cover-volume-text': !volumeLabel(book).match(/^\d/) }">{{ volumeLabel(book) }}</div>
                  <div class="cover-series">{{ coverSeriesLabel(book) }}</div>
                </div>
                <div class="cover-footer">
                  <div class="seal"><span>{{ sealLabel(book) }}</span></div>
                  <div class="cover-stats">
                    <span>{{ book.sectionCount }} 段</span>
                    <span class="dot">·</span>
                    <span>{{ book.questionCount }} 题</span>
                  </div>
                </div>
              </div>
              <div class="cover-shine"></div>
              <div class="book-hover-card">
                <h4 class="hover-title">{{ book.title }}</h4>
                <span class="hover-arrow"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg></span>
              </div>
            </article>
            <div v-for="pad in rowPadding(shelf.length)" :key="'pad-'+pad" class="book-card placeholder"></div>
          </div>
          <div class="shelf-board"></div>
        </div>
      </div>

      <div v-if="category === 'IELTS' && gBooks.length" class="shelf-section">
        <div class="shelf-section-title">培训类 · G</div>
        <div v-for="(shelf, sIdx) in shelfRowsG" :key="'G' + sIdx" class="shelf">
          <div class="shelf-books">
            <article
              v-for="book in shelf"
              :key="book.id"
              class="book-card"
              :class="bookTheme(book)"
              :style="bookTilt(book)"
              @click="openBook(book)"
              :title="book.title"
            >
              <div class="book-spine">
                <span class="spine-title">{{ spineTitle(book) }}</span>
                <div class="spine-lines"><i></i><i></i><i></i><i></i><i></i></div>
              </div>
              <div class="book-face">
                <div class="cover-band"><span class="brand-label">GENERAL TRAINING</span></div>
                <div class="cover-center">
                  <div class="cover-volume" :class="{ 'cover-volume-text': !volumeLabel(book).match(/^\d/) }">{{ volumeLabel(book) }}</div>
                  <div class="cover-series">{{ coverSeriesLabel(book) }}</div>
                </div>
                <div class="cover-footer">
                  <div class="seal"><span>{{ sealLabel(book) }}</span></div>
                  <div class="cover-stats">
                    <span>{{ book.sectionCount }} 段</span>
                    <span class="dot">·</span>
                    <span>{{ book.questionCount }} 题</span>
                  </div>
                </div>
              </div>
              <div class="cover-shine"></div>
              <div class="book-hover-card">
                <h4 class="hover-title">{{ book.title }}</h4>
                <span class="hover-arrow"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5l7 7-7 7"/></svg></span>
              </div>
            </article>
            <div v-for="pad in rowPadding(shelf.length)" :key="'gpad-'+pad" class="book-card placeholder"></div>
          </div>
          <div class="shelf-board"></div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PageHeader from '../components/PageHeader.vue'
import EmptyState from '../components/EmptyState.vue'
import { examApi, DATA_SOURCE_LABELS, type ExamBook, type BookDataSource } from '../api/exam'

const route = useRoute()
const router = useRouter()

function initialDataSource(): BookDataSource {
  const s = String(route.query.source || '').toUpperCase()
  if (s === 'LEGACY') return 'LEGACY'
  return 'CURATED'
}

function initialCategory(): string {
  const c = String(route.query.cat || '').toUpperCase()
  if (c === 'IELTS') return 'IELTS'
  if (c === 'GRE') return 'GRE'
  if (c === 'CET4') return 'CET4'
  if (c === 'CET6') return 'CET6'
  if (c === 'KAOYAN') return 'KAOYAN'
  return 'TOEFL'
}

const dataSource = ref<BookDataSource>(initialDataSource())
const category = ref<string>(initialCategory())
const books = ref<ExamBook[]>([])
const loading = ref(true)

const isCurated = computed(() => dataSource.value === 'CURATED')

const availableSources = ref<{ key: BookDataSource; label: string; count: number | null }[]>([
  { key: 'CURATED', label: DATA_SOURCE_LABELS.CURATED, count: null },
  { key: 'LEGACY', label: DATA_SOURCE_LABELS.LEGACY, count: null },
])

const ALL_CATEGORIES = ['TOEFL', 'IELTS', 'GRE', 'CET4', 'CET6', 'KAOYAN']
const categories = computed(() => ALL_CATEGORIES)

function catLabel(cat: string): string {
  const labels: Record<string, string> = {
    TOEFL: 'TOEFL',
    IELTS: 'IELTS',
    GRE: 'GRE',
    CET4: '四级',
    CET6: '六级',
    KAOYAN: '考研',
  }
  return labels[cat] ?? cat
}

function switchDataSource(ds: BookDataSource) {
  dataSource.value = ds
  router.replace({ path: '/exam', query: { cat: category.value, source: ds } })
  load()
}

const totalQuestions = computed(() => books.value.reduce((s, b) => s + b.questionCount, 0))

// 精选题库：区分真题和模考
const realExamBooks = computed(() =>
  books.value.filter((b) => !b.id.includes('round') && !b.title.includes('模考'))
)
const mockExamBooks = computed(() =>
  books.value.filter((b) => b.id.includes('round') || b.title.includes('模考'))
)

// 网盘筛选的书架布局
function isGBook(book: ExamBook): boolean {
  return /G类/i.test(book.title)
}

const BOOKS_PER_SHELF = 5
function toShelfRows(list: ExamBook[]): ExamBook[][] {
  const result: ExamBook[][] = []
  for (let i = 0; i < list.length; i += BOOKS_PER_SHELF) {
    result.push(list.slice(i, i + BOOKS_PER_SHELF))
  }
  return result
}
const aBooks = computed(() => books.value.filter((b) => !isGBook(b)))
const gBooks = computed(() => books.value.filter((b) => isGBook(b)))
const shelfRowsA = computed<ExamBook[][]>(() => toShelfRows(aBooks.value))
const shelfRowsG = computed<ExamBook[][]>(() => toShelfRows(gBooks.value))
function rowPadding(len: number): number[] {
  const n = Math.max(0, BOOKS_PER_SHELF - len)
  return Array.from({ length: n }, (_, i) => i)
}

async function load() {
  loading.value = true
  try {
    const list = await examApi.listBooks(category.value, dataSource.value)
    books.value = list.filter((b) => b.sectionCount > 0)
  } catch {
    books.value = []
  } finally {
    loading.value = false
  }
}

async function loadSourceCounts() {
  try {
    const sources = await examApi.listDataSources()
    const countMap = new Map(sources.map((s) => [s.dataSource, s.bookCount]))
    availableSources.value = availableSources.value.map((s) => ({
      ...s,
      count: countMap.get(s.key) ?? 0,
    }))
  } catch {
    // 静默失败
  }
}

function switchCategory(cat: string) {
  category.value = cat
  router.replace({ path: '/exam', query: { cat, source: dataSource.value } })
  load()
}

function openBook(book: ExamBook) {
  router.push({ path: `/exam/book/${book.id}`, query: { cat: category.value, source: dataSource.value } })
}

onMounted(() => {
  load()
  loadSourceCounts()
})

// —— 精选题库卡片相关 ——
function curatedBadge(book: ExamBook): string {
  const cat = category.value
  if (cat === 'TOEFL') {
    if (book.id.includes('reading')) return 'READING'
    if (book.id.includes('listening')) return 'LISTENING'
    if (book.id.includes('speaking')) return 'SPEAKING'
    if (book.id.includes('writing')) return 'WRITING'
    return 'TOEFL'
  }
  if (cat === 'IELTS') return 'CAMBRIDGE'
  if (cat === 'GRE') return 'GRE'
  if (cat === 'CET4') return 'CET-4'
  if (cat === 'CET6') return 'CET-6'
  if (cat === 'KAOYAN') return '考研'
  return cat
}

function curatedTheme(book: ExamBook): string {
  if (book.id.includes('reading')) return 'theme-reading'
  if (book.id.includes('listening')) return 'theme-listening'
  if (book.id.includes('speaking')) return 'theme-speaking'
  if (book.id.includes('writing')) return 'theme-writing'
  return 'theme-default'
}

// —— 网盘筛选书架相关 ——
function extractNumFromTitle(title: string): number {
  if (!title) return 1
  const m = title.match(/(\d+)/)
  return m ? parseInt(m[1], 10) : 1
}

function brandLabel(book: ExamBook): string {
  const cat = category.value
  if (cat === 'TOEFL') {
    if (book.dataSource === 'LEGACY') return 'OFFICIAL'
    return 'TOEFL PRACTICE'
  }
  if (cat === 'IELTS') return 'CAMBRIDGE'
  if (cat === 'GRE') return 'GRE PRACTICE'
  if (cat === 'CET4') return 'CET-4'
  if (cat === 'CET6') return 'CET-6'
  if (cat === 'KAOYAN') return '考研真题'
  return cat
}

function volumeLabel(book: ExamBook): string {
  const n = extractNumFromTitle(book.title)
  if (category.value === 'TOEFL') {
    if (book.dataSource === 'LEGACY') return `TPO ${n}`
    return book.title.length <= 12 ? book.title : `${n}`
  }
  if (category.value === 'IELTS') {
    if (book.dataSource === 'LEGACY') return `${n}`
    return book.title.length <= 12 ? book.title : `${n}`
  }
  return book.title.length <= 12 ? book.title : `${n}`
}

function coverSeriesLabel(book: ExamBook): string {
  const cat = category.value
  if (cat === 'TOEFL') {
    if (book.dataSource === 'LEGACY') return 'TPO · Official'
    return 'TOEFL · Practice'
  }
  if (cat === 'IELTS') {
    if (book.dataSource === 'LEGACY') return 'IELTS · Authentic'
    return 'IELTS · Practice'
  }
  if (cat === 'GRE') return 'GRE · Practice'
  if (cat === 'CET4') return 'CET-4 · 真题'
  if (cat === 'CET6') return 'CET-6 · 真题'
  if (cat === 'KAOYAN') return '考研 · 真题'
  return cat
}

function sealLabel(book: ExamBook): string {
  const cat = category.value
  if (cat === 'TOEFL') return 'ETS'
  if (cat === 'IELTS') return isGBook(book) ? 'G' : 'A'
  if (cat === 'GRE') return 'GRE'
  if (cat === 'CET4') return '4'
  if (cat === 'CET6') return '6'
  if (cat === 'KAOYAN') return '考'
  return cat.charAt(0)
}

function spineTitle(book: ExamBook): string {
  const cat = category.value
  const n = extractNumFromTitle(book.title)
  if (cat === 'TOEFL') return `TOEFL·${n}`
  if (cat === 'IELTS') return `IELTS·${n}`
  if (cat === 'GRE') return `GRE·${n}`
  if (cat === 'CET4') return `CET4·${n}`
  if (cat === 'CET6') return `CET6·${n}`
  if (cat === 'KAOYAN') return `考研·${n}`
  return `${n}`
}

function stableHash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h
}

const TOEFL_THEMES = [
  { from: '#1e3a8a', to: '#3b82f6', accent: '#60a5fa' },
  { from: '#312e81', to: '#6366f1', accent: '#a5b4fc' },
  { from: '#4c1d95', to: '#8b5cf6', accent: '#c4b5fd' },
  { from: '#0c4a6e', to: '#0ea5e9', accent: '#7dd3fc' },
  { from: '#1e40af', to: '#3b82f6', accent: '#93c5fd' },
]
const IELTS_THEMES = [
  { from: '#14532d', to: '#16a34a', accent: '#86efac' },
  { from: '#064e3b', to: '#10b981', accent: '#6ee7b7' },
  { from: '#78350f', to: '#d97706', accent: '#fcd34d' },
  { from: '#3f3f46', to: '#71717a', accent: '#d4d4d8' },
  { from: '#7c2d12', to: '#ea580c', accent: '#fdba74' },
]

function bookTheme(book: ExamBook): string {
  const pool = category.value === 'TOEFL' ? TOEFL_THEMES : IELTS_THEMES
  const idx = stableHash(String(book.id ?? book.title)) % pool.length
  return `theme-${idx}`
}

function bookTilt(book: ExamBook): Record<string, string> {
  const h = stableHash(String(book.id ?? book.title))
  const deg = ((h % 5) - 2) * 0.35
  return { '--book-rotate': `${deg}deg` }
}
</script>

<style scoped>
.exam-page {
  padding: var(--space-6);
  max-width: 1320px;
  margin: 0 auto;
}

/* ── 数据来源切换区 ── */
.source-section { margin: 12px 0 0; }
.source-group {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  flex-wrap: wrap;
}
.source-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text-muted);
  margin-right: 4px;
  white-space: nowrap;
}
.source-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 999px;
  border: 1.5px solid transparent;
  background: transparent;
  cursor: pointer;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-text-muted);
  font-family: var(--font-sans);
  transition: all 0.2s;
}
.source-btn:hover {
  color: var(--color-text);
  background: var(--color-bg-hover, rgba(0,0,0,0.03));
}
.source-btn.active {
  background: var(--color-surface);
  border-color: var(--color-brand-500);
  color: var(--color-brand-600, var(--color-info-600));
  box-shadow: 0 1px 4px rgba(79, 70, 229, 0.1);
}
.source-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.source-dot.dot-LEGACY { background: var(--color-text-300); }
.source-dot.dot-CURATED { background: var(--color-info-500); }
.source-count {
  font-size: 0.6875rem;
  font-weight: 500;
  color: var(--color-text-muted);
  background: var(--color-bg-hover, rgba(0,0,0,0.04));
  padding: 1px 6px;
  border-radius: 999px;
}

.filters-section {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 12px 0 var(--space-6);
  flex-wrap: wrap;
  gap: 12px;
}
.filter-group {
  display: flex;
  gap: 8px;
  padding: 4px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 999px;
}
.filter-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 22px;
  border-radius: 999px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-text-muted);
  font-family: var(--font-sans);
  transition: all 0.2s;
}
.filter-btn:hover { color: var(--color-text); }
.filter-btn.active {
  background: linear-gradient(135deg, var(--color-brand-600) 0%, var(--color-brand-700) 100%);
  color: #fff;
  box-shadow: 0 3px 10px rgba(79, 70, 229, 0.25);
}
.filter-btn-icon {
  width: 16px;
  height: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.filter-btn-icon :deep(svg) { width: 100%; height: 100%; }

.filter-summary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8125rem;
  color: var(--color-text-muted);
  font-weight: 500;
  padding: 6px 12px;
  background: var(--color-surface);
  border-radius: 999px;
  border: 1px solid var(--color-border);
}
.filter-summary svg { color: var(--color-primary); }

/* ============ 精选题库布局 ============ */
.curated-area {
  display: flex;
  flex-direction: column;
  gap: 40px;
}
.curated-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.curated-section-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--color-text);
  margin: 0;
}
.section-icon { font-size: 1.3rem; }
.section-count {
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--color-text-muted);
  background: var(--color-bg-hover, rgba(0,0,0,0.04));
  padding: 2px 10px;
  border-radius: 999px;
}
.curated-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}
.curated-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 14px;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
}
.curated-card:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
}
.curated-card-header {
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #fff;
}
.curated-card-header.theme-reading {
  background: linear-gradient(135deg, var(--color-success-900) 0%, var(--color-success-500) 100%);
}
.curated-card-header.theme-listening {
  background: linear-gradient(135deg, var(--color-info-800) 0%, var(--color-info-500) 100%);
}
.curated-card-header.theme-speaking {
  background: linear-gradient(135deg, var(--color-warning-900) 0%, var(--color-warning-600) 100%);
}
.curated-card-header.theme-writing {
  background: linear-gradient(135deg, #4c1d95 0%, #8b5cf6 100%);
}
.curated-card-header.theme-default {
  background: linear-gradient(135deg, var(--color-info-700) 0%, var(--color-info-500) 100%);
}
.curated-card-header.mock-header {
  background: linear-gradient(135deg, var(--color-brand-700) 0%, var(--color-text-muted) 100%);
}
.curated-badge {
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 1.5px;
  font-family: 'Georgia', serif;
}
.curated-cat {
  font-size: 0.75rem;
  font-weight: 600;
  opacity: 0.9;
}
.curated-card-body {
  padding: 16px;
}
.curated-title {
  font-size: 1rem;
  font-weight: 700;
  margin: 0 0 8px;
  color: var(--color-text);
  line-height: 1.4;
}
.curated-desc {
  font-size: 0.8125rem;
  color: var(--color-text-muted);
  margin: 0 0 14px;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.curated-stats {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--color-border);
}
.stat-item {
  display: flex;
  align-items: baseline;
  gap: 4px;
}
.stat-num {
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--color-brand-600, var(--color-info-600));
  font-family: 'Georgia', serif;
}
.stat-label {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--color-text-muted);
}
.stat-divider {
  color: var(--color-text-muted);
  opacity: 0.4;
}

.curated-card.skeleton {
  height: 200px;
  background: linear-gradient(90deg, var(--color-surface-subtle) 25%, var(--color-border) 37%, var(--color-surface-subtle) 63%);
  background-size: 400% 100%;
  animation: shimmer 1.4s ease infinite;
  border-radius: 14px;
}

/* ============ 网盘筛选书架布局 ============ */
.shelves {
  display: flex;
  flex-direction: column;
  gap: 56px;
  padding-bottom: 28px;
}
.shelf-section {
  display: flex;
  flex-direction: column;
  gap: 28px;
}
.shelf-section-title {
  font-size: 15px;
  font-weight: 700;
  color: var(--color-text-600);
  padding: 0 18px 4px;
  letter-spacing: 1px;
  display: flex;
  align-items: center;
  gap: 8px;
}
.shelf-section-title::before {
  content: '';
  flex: 1;
  height: 1px;
  background: var(--color-border-strong);
}
.shelf { position: relative; }
.shelf-books {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 20px 28px;
  padding: 0 18px 8px;
  align-items: end;
  min-height: 260px;
}
.shelf-board {
  height: 18px;
  background:
    linear-gradient(180deg, rgba(120,75,40,0.25) 0%, rgba(120,75,40,0.6) 10%, rgba(90,55,25,0.9) 45%, rgba(60,35,15,1) 100%),
    repeating-linear-gradient(90deg, rgba(255,255,255,0.03) 0px, rgba(255,255,255,0.03) 2px, transparent 2px, transparent 8px);
  border-radius: 4px 4px 10px 10px;
  box-shadow: 0 4px 0 rgba(0,0,0,0.18), 0 10px 20px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.1);
  position: relative;
}
.shelf-board::before {
  content: '';
  position: absolute;
  top: -2px; left: 0; right: 0;
  height: 4px;
  background: linear-gradient(90deg, rgba(255,255,255,0.15), rgba(255,255,255,0.3), rgba(255,255,255,0.15));
  border-radius: 2px;
}

.loading-area { padding-bottom: 28px; }
.loading-area .shelf-books {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
}
.loading-area .book-card { height: 250px; }

/* ── 单本书：3D 立体效果 ── */
.book-card {
  position: relative;
  height: 250px;
  display: flex;
  cursor: pointer;
  transform-origin: bottom center;
  transform: perspective(800px) rotateY(-3deg) rotate(var(--book-rotate, 0deg));
  transition: transform 0.35s cubic-bezier(.2,.7,.2,1), box-shadow 0.3s ease, filter 0.3s ease;
  filter: drop-shadow(2px 6px 4px rgba(0,0,0,0.25));
  user-select: none;
}
.book-card:hover {
  transform: perspective(900px) rotateY(-3deg) rotate(var(--book-rotate, 0deg)) translateY(-10px) scale(1.02);
  filter: drop-shadow(4px 16px 14px rgba(0,0,0,0.35));
  z-index: 5;
}
.book-card.placeholder { opacity: 0.08; pointer-events: none; }

/* 主题色 */
.theme-0 { --c-from: #1e3a8a; --c-to: #3b82f6; --c-accent: #60a5fa; }
.theme-1 { --c-from: #312e81; --c-to: #6366f1; --c-accent: #a5b4fc; }
.theme-2 { --c-from: #4c1d95; --c-to: #8b5cf6; --c-accent: #c4b5fd; }
.theme-3 { --c-from: #0c4a6e; --c-to: #0ea5e9; --c-accent: #7dd3fc; }
.theme-4 { --c-from: #1e40af; --c-to: #3b82f6; --c-accent: #93c5fd; }

.book-face, .book-spine {
  background: linear-gradient(135deg, var(--c-from, #4f46e5) 0%, var(--c-to, #7c3aed) 100%);
}

.cover-volume-text {
  font-size: 16px !important;
  line-height: 1.3;
  font-weight: 800;
  word-break: break-word;
  padding: 0 4px;
}

.book-spine {
  position: relative;
  width: 24px;
  flex-shrink: 0;
  border-radius: 2px 0 0 2px;
  box-shadow: inset -3px 0 4px rgba(0,0,0,0.35), inset 0 0 1px rgba(255,255,255,0.08);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: space-between;
  padding: 14px 0;
  background: linear-gradient(180deg, color-mix(in srgb, var(--c-from, #4f46e5) 85%, black 15%) 0%, color-mix(in srgb, var(--c-to, #7c3aed) 90%, black 10%) 100%);
}
.book-spine::after {
  content: '';
  position: absolute;
  top: 0; right: 0; bottom: 0;
  width: 1px;
  background: rgba(255,255,255,0.12);
}
.spine-title {
  writing-mode: vertical-rl;
  text-orientation: upright;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 1px;
  color: rgba(255,255,255,0.9);
  font-family: 'Georgia', serif;
  text-shadow: 0 1px 0 rgba(0,0,0,0.3);
}
.spine-lines {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 10px;
}
.spine-lines i {
  height: 1px;
  background: var(--c-accent, #c4b5fd);
  opacity: 0.6;
}

.book-face {
  position: relative;
  flex: 1;
  min-width: 0;
  border-radius: 0 3px 3px 0;
  overflow: hidden;
  box-shadow: inset -8px 0 16px rgba(0,0,0,0.18), inset 0 0 0 1px rgba(255,255,255,0.08);
  padding: 20px 16px 16px;
  display: flex;
  flex-direction: column;
  color: #fff;
}

.cover-band {
  position: relative;
  width: 100%;
  padding: 6px 10px;
  border-top: 2px solid rgba(255,255,255,0.8);
  border-bottom: 2px solid rgba(255,255,255,0.8);
  text-align: center;
  margin-bottom: 16px;
}
.cover-band::before, .cover-band::after {
  content: '';
  position: absolute;
  left: 4px; right: 4px;
  height: 1px;
  background: rgba(255,255,255,0.5);
}
.cover-band::before { top: 1px; }
.cover-band::after { bottom: 1px; }
.brand-label {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 2.5px;
  font-family: 'Georgia', serif;
  color: rgba(255,255,255,0.95);
}

.cover-center {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  text-align: center;
  padding: 0 4px;
}
.cover-volume {
  font-size: 56px;
  line-height: 1;
  font-weight: 900;
  font-family: 'Georgia', serif;
  color: #fff;
  letter-spacing: -0.5px;
  text-shadow: 0 2px 0 rgba(0,0,0,0.2), 0 4px 12px rgba(0,0,0,0.25), 0 0 30px rgba(255,255,255,0.12);
}
.cover-series {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: var(--c-accent, #e9d5ff);
  font-family: var(--font-sans);
}

.cover-footer {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 8px;
  margin-top: auto;
}
.seal {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 2px solid rgba(255,255,255,0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255,255,255,0.05);
  box-shadow: inset 0 0 0 1px rgba(255,255,255,0.2);
}
.seal span {
  font-size: 9px;
  font-weight: 900;
  letter-spacing: 0.5px;
  color: #fff;
  font-family: 'Georgia', serif;
  transform: rotate(-8deg);
}
.cover-stats {
  font-size: 10px;
  font-weight: 600;
  color: rgba(255,255,255,0.85);
  text-align: right;
  line-height: 1.4;
  font-family: var(--font-sans);
}
.cover-stats .dot { opacity: 0.5; margin: 0 2px; }

.cover-shine {
  position: absolute;
  top: 0; right: 0;
  width: 40%;
  height: 100%;
  background: linear-gradient(120deg, transparent 0%, transparent 30%, rgba(255,255,255,0.1) 48%, rgba(255,255,255,0.25) 50%, rgba(255,255,255,0.08) 52%, transparent 75%, transparent 100%);
  mix-blend-mode: screen;
  pointer-events: none;
  transition: opacity 0.4s ease;
}
.book-card:hover .cover-shine { opacity: 0.4; }

.book-hover-card {
  position: absolute;
  bottom: -46px;
  left: 50%;
  transform: translateX(-50%) translateY(6px);
  min-width: 180px;
  max-width: 220px;
  padding: 10px 14px;
  background: var(--color-surface);
  border: 1px solid var(--color-border-strong);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.18);
  opacity: 0;
  pointer-events: none;
  transition: all 0.28s cubic-bezier(.2,.7,.2,1);
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.book-hover-card::before {
  content: '';
  position: absolute;
  top: -5px;
  left: 50%;
  transform: translateX(-50%) rotate(45deg);
  width: 9px;
  height: 9px;
  background: var(--color-surface);
  border-left: 1px solid var(--color-border-strong);
  border-top: 1px solid var(--color-border-strong);
}
.book-card:hover .book-hover-card {
  opacity: 1;
  transform: translateX(-50%) translateY(0);
}
.hover-title {
  margin: 0;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-text);
  line-height: 1.3;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.hover-arrow {
  flex-shrink: 0;
  color: var(--color-primary);
  display: inline-flex;
}

.book-card.skeleton {
  background: linear-gradient(135deg, var(--color-border) 0%, var(--color-border-strong) 100%);
  border-radius: 2px 3px 3px 2px;
  position: relative;
  overflow: hidden;
}
.book-card.skeleton::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(90deg, transparent 25%, rgba(255,255,255,0.5) 37%, transparent 63%);
  background-size: 400% 100%;
  animation: shimmer 1.4s ease infinite;
}
@keyframes shimmer {
  0% { background-position: 100% 0; }
  100% { background-position: -100% 0; }
}

@media (max-width: 1100px) {
  .shelf-books { grid-template-columns: repeat(4, 1fr); }
  .loading-area .shelf-books { grid-template-columns: repeat(4, 1fr); }
  .cover-volume { font-size: 48px; }
}
@media (max-width: 880px) {
  .exam-page { padding: var(--space-4); }
  .shelf-books { grid-template-columns: repeat(3, 1fr); }
  .loading-area .shelf-books { grid-template-columns: repeat(3, 1fr); }
  .shelves { gap: 48px; }
  .book-card { height: 230px; }
  .cover-volume { font-size: 42px; }
  .book-spine { width: 20px; }
  .curated-grid { grid-template-columns: 1fr; }
}
@media (max-width: 620px) {
  .shelf-books { grid-template-columns: repeat(2, 1fr); }
  .loading-area .shelf-books { grid-template-columns: repeat(2, 1fr); }
  .book-card { height: 220px; }
  .cover-volume { font-size: 38px; }
  .shelves { gap: 40px; }
}
</style>