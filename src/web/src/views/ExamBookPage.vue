<template>
  <div class="exam-book-page">
    <div class="topbar">
      <button class="back-btn" @click="goBack">← 返回</button>
      <h2 class="title">{{ book?.title ?? '真题' }}</h2>
      <span v-if="ieltsTypeLabel" class="type-badge">{{ ieltsTypeLabel }}</span>
      <span class="topbar-subtitle">选择段落开始练习</span>
    </div>

    <section v-if="loading" class="section-list">
      <div v-for="i in 6" :key="i" class="section-card skeleton"></div>
    </section>

    <EmptyState v-else-if="!book || sections.length === 0" title="该真题书暂无内容" />

    <!-- IELTS：先按 Test 分组，每组内再按 type 分组 -->
    <template v-else-if="isIelts">
      <section v-for="(tGroup, testLabel) in groupedByTest" :key="testLabel" class="group-block">
        <h3 class="test-title">
          <span class="test-badge">📘</span>
          {{ testLabel }}
          <span class="test-count">共 {{ tGroup.length }} 段</span>
        </h3>
        <div v-for="(list, typeKey) in groupByType(tGroup)" :key="typeKey" class="type-group">
          <div class="type-label" :class="typeClass(typeKey)">
            <span class="type-icon">{{ typeIcon(typeKey) }}</span>
            {{ typeLabel(typeKey) }}
            <span class="type-sub">（{{ list.length }} 段）</span>
          </div>
          <div class="section-list">
            <div
              v-for="sec in list"
              :key="sec.id"
              class="section-card"
              @click="openSection(sec)"
            >
              <div class="section-icon" :class="typeClass(sec.type)">
                <span>{{ typeIcon(sec.type) }}</span>
              </div>
              <div class="section-info">
                <h3 class="section-title">{{ cleanTitle(sec.title, testLabel) }}</h3>
                <div class="section-meta">
                  <span>{{ typeLabel(sec.type) }}</span>
                  <span>{{ sec.questionCount }} 题</span>
                  <span v-if="sec.audioUrl">🎵 含音频</span>
                </div>
              </div>
              <div class="section-arrow">›</div>
            </div>
          </div>
        </div>
      </section>
    </template>

    <!-- TOEFL/其他：直接按 type 分组 -->
    <section v-else class="group-block">
      <div v-for="(list, typeKey) in groupedByType" :key="typeKey" class="type-group">
        <div class="type-label" :class="typeClass(typeKey)">
          <span class="type-icon">{{ typeIcon(typeKey) }}</span>
          {{ typeLabel(typeKey) }}
          <span class="type-sub">（{{ list.length }} 段）</span>
        </div>
        <div class="section-list">
          <div
            v-for="sec in list"
            :key="sec.id"
            class="section-card"
            @click="openSection(sec)"
          >
            <div class="section-icon" :class="typeClass(sec.type)">
              <span>{{ typeIcon(sec.type) }}</span>
            </div>
            <div class="section-info">
              <h3 class="section-title">{{ sec.title }}</h3>
              <div class="section-meta">
                <span>{{ typeLabel(sec.type) }}</span>
                <span>{{ sec.questionCount }} 题</span>
                <span v-if="sec.audioUrl">🎵 含音频</span>
              </div>
            </div>
            <div class="section-arrow">›</div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import EmptyState from '../components/EmptyState.vue'
import { examApi, type ExamSection } from '../api/exam'

const route = useRoute()
const router = useRouter()
const book = ref<{ id: string; title: string; category: string } | null>(null)
const sections = ref<ExamSection[]>([])
const loading = ref(true)

const TYPE_ORDER = ['LISTENING', 'ARTICLE', 'SPEAKING', 'WRITING', 'READING'] as const

/** 返回书架并保持所在分类和数据来源（从哪本进来的就回到哪个分类） */
function goBack() {
  const cat = route.query.cat || (book.value?.category === 'IELTS' ? 'IELTS' : 'TOEFL')
  const source = route.query.source || undefined
  const query: Record<string, string> = { cat: cat as string }
  if (source) query.source = source as string
  router.push({ path: '/exam', query })
}

/** 雅思 A/G 类标识：从书名判断 */
const ieltsTypeLabel = computed(() => {
  const t = book.value?.title ?? ''
  if (/G类/i.test(t)) return 'G 类 · 培训类'
  if ((book.value?.category ?? '').toUpperCase() === 'IELTS') return 'A 类 · 学术类'
  return ''
})

function typeLabel(t: string) {
  return { LISTENING: '听力', SPEAKING: '口语', ARTICLE: '阅读', WRITING: '写作', READING: '阅读' }[t] ?? t
}
function typeIcon(t: string) {
  return { LISTENING: '🎧', SPEAKING: '🎙️', ARTICLE: '📖', WRITING: '✍️', READING: '📖' }[t] ?? '📄'
}
function typeClass(t: string) {
  return { LISTENING: 'type-listen', SPEAKING: 'type-speak', ARTICLE: 'type-read', WRITING: 'type-write', READING: 'type-read' }[t] ?? 'type-read'
}

const isIelts = computed(() => (book.value?.category ?? '').toUpperCase() === 'IELTS')

/** 按 type 分组，并按 TYPE_ORDER 排序（返回 object 但 Vue 遍历会尊重插入顺序） */
function groupByType(list: ExamSection[]) {
  const m: Record<string, ExamSection[]> = {}
  for (const t of TYPE_ORDER) m[t] = []
  for (const s of list) {
    if (!m[s.type]) m[s.type] = []
    m[s.type].push(s)
  }
  // 按 bookOrder 升序
  for (const k of Object.keys(m)) {
    m[k] = m[k].sort((a, b) => (a.bookOrder || 0) - (b.bookOrder || 0))
  }
  // 去掉空组
  for (const k of Object.keys(m)) if (m[k].length === 0) delete m[k]
  return m
}
const groupedByType = computed(() => groupByType(sections.value))

/** IELTS：按 Test 分组，从 title/sourceUrl 里抽 "Test X" */
function extractTest(sec: ExamSection): string {
  // 例："A类 剑17 Test 1 Listening Part 1" / "TOEFL TPO 1 ..."
  const m = sec.title.match(/Test\s+(\d+)/i)
  if (m) return `Test ${m[1]}`
  return '综合'
}
const groupedByTest = computed(() => {
  const m: Record<string, ExamSection[]> = {}
  for (const s of sections.value) {
    const t = extractTest(s)
    if (!m[t]) m[t] = []
    m[t].push(s)
  }
  // 按 Test 数字排序
  const sorted: Record<string, ExamSection[]> = {}
  Object.keys(m)
    .sort((a, b) => {
      const na = parseInt((a.match(/\d+/) || ['0'])[0], 10)
      const nb = parseInt((b.match(/\d+/) || ['0'])[0], 10)
      return na - nb
    })
    .forEach((k) => (sorted[k] = m[k]))
  return sorted
})

/** 雅思段落里重复的 "A类 剑17 Test 1" 前缀可以去掉，让列表更清爽 */
function cleanTitle(title: string, testLabel: string) {
  // "A类 剑17 Test 1 Listening Part 1" → "Listening Part 1"
  const prefix = new RegExp(`^\\s*[AG]类\\s*剑\\d+\\s*${testLabel}\\s*`, 'i')
  return title.replace(prefix, '')
}

function openSection(sec: ExamSection) {
  router.push(`/exam/content/${sec.id}`)
}

onMounted(async () => {
  try {
    const data = await examApi.getBook(route.params.id as string)
    book.value = { id: data.id, title: data.title, category: data.category }
    sections.value = data.sections
  } catch {
    book.value = null
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.topbar {
  display: flex;
  align-items: center;
  gap: 12px;
  max-width: 860px;
  margin: 0 auto 18px;
  flex-wrap: wrap;
}
.back-btn {
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  cursor: pointer;
  font-size: 14px;
  color: var(--color-info-500);
  padding: 7px 14px;
  border-radius: 999px;
  transition: all 0.15s;
  flex-shrink: 0;
}
.back-btn:hover {
  background: var(--color-info-50);
  border-color: var(--color-info-500);
}
.topbar .title {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: var(--color-text);
}
.topbar-subtitle {
  font-size: 13px;
  color: var(--color-text-muted);
  width: 100%;
  margin-top: -6px;
}
.type-badge {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-info-500);
  background: var(--color-info-50);
  padding: 3px 10px;
  border-radius: 999px;
  flex-shrink: 0;
}
.group-block {
  max-width: 860px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.test-title {
  margin: 24px 0 6px;
  font-size: 17px;
  font-weight: 700;
  color: var(--color-text);
  display: flex;
  align-items: center;
  gap: 10px;
}
.test-badge { font-size: 20px; }
.test-count {
  margin-left: auto;
  font-weight: 500;
  font-size: 12px;
  color: var(--color-text-muted);
  background: var(--color-info-50);
  padding: 3px 10px;
  border-radius: 999px;
}
.type-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.type-label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  width: fit-content;
  margin: 4px 0 2px;
}
.type-label.type-listen { background: var(--color-info-50); color: var(--color-info-500); }
.type-label.type-read   { background: var(--color-success-50); color: #1faa48; }
.type-label.type-speak  { background: var(--color-warning-50); color: var(--color-warning-600); }
.type-label.type-write  { background: #f4eaff; color: #7c3aed; }
.type-icon { font-size: 14px; }
.type-sub { font-weight: 400; opacity: 0.85; margin-left: 2px; }

.section-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.section-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 18px;
  background: var(--color-surface);
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  cursor: pointer;
  transition: transform 0.15s, box-shadow 0.15s;
}
.section-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.09);
}
.section-icon {
  font-size: 22px;
  width: 42px;
  height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  flex-shrink: 0;
  background: var(--color-info-50);
}
.section-icon.type-listen { background: var(--color-info-50); }
.section-icon.type-read   { background: var(--color-success-50); }
.section-icon.type-speak  { background: var(--color-warning-50); }
.section-icon.type-write  { background: #f4eaff; }
.section-info {
  flex: 1;
  min-width: 0;
}
.section-title {
  font-size: 15px;
  font-weight: 600;
  margin: 0 0 6px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.section-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: var(--color-text-muted);
}
.section-arrow {
  font-size: 22px;
  color: var(--color-text-300);
  flex-shrink: 0;
}
.skeleton {
  height: 70px;
  background: linear-gradient(90deg, var(--color-surface-subtle) 25%, var(--color-border) 37%, var(--color-surface-subtle) 63%);
  background-size: 400% 100%;
  animation: shimmer 1.4s ease infinite;
  border-radius: 12px;
}
@keyframes shimmer {
  0% { background-position: 100% 0; }
  100% { background-position: -100% 0; }
}

/* ── Responsive ── */
@media (max-width: 768px) {
  .shelf-container { padding: var(--space-3) !important; }
  .book-shelf { grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)) !important; gap: var(--space-3) !important; }
  .book-card { transform: none !important; }
  .book-hover-card { display: none !important; }
}
</style>
