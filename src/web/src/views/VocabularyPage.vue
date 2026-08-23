<template>
  <div class="vocabulary-page">
    <PageHeader title="词汇" :subtitle="`词典库 · 共 ${total.toLocaleString()} 词`" />

    <!-- Search + Pagination -->
    <div class="toolbar">
      <BaseInput v-model="searchQuery" placeholder="搜索单词..." @input="onSearchInput">
        <template #prefix>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.3-4.3"/>
          </svg>
        </template>
      </BaseInput>
      <div class="page-info" v-if="!loading">
        第 {{ page }} / {{ totalPages }} 页
      </div>
    </div>

    <!-- Loading -->
    <Skeleton v-if="loading" variant="table" />

    <!-- Empty -->
    <EmptyState
      v-else-if="entries.length === 0"
      title="未找到词汇"
      description="试试搜索其他单词"
    />

    <!-- Word List -->
    <div v-else class="word-grid">
      <div
        v-for="entry in entries"
        :key="entry.id"
        class="word-card"
        @click="showDetail(entry)"
      >
        <div class="word-card-header">
          <span class="word-card-text">{{ entry.word }}</span>
          <span v-if="entry.payload?.phonetic?.us" class="word-card-phonetic">/{{ entry.payload.phonetic.us }}/</span>
        </div>
        <div class="word-card-body">
          <p v-if="entry.payload?.translations?.length" class="word-card-translation">
            {{ entry.payload.translations.map(t => t.cn).join('；') }}
          </p>
          <div v-if="entry.payload?.exams?.length" class="word-card-exams">
            <BaseTag v-for="exam in entry.payload.exams.slice(0, 4)" :key="exam" size="sm">{{ exam }}</BaseTag>
          </div>
        </div>
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="pagination">
      <BaseButton variant="secondary" size="sm" :disabled="page <= 1" @click="changePage(page - 1)">上一页</BaseButton>
      <span class="page-numbers">
        <button
          v-for="p in visiblePages"
          :key="p"
          :class="['page-btn', { active: p === page }]"
          @click="changePage(p)"
        >{{ p }}</button>
      </span>
      <BaseButton variant="secondary" size="sm" :disabled="page >= totalPages" @click="changePage(page + 1)">下一页</BaseButton>
    </div>

    <!-- Word Detail Modal -->
    <BaseModal v-model="detailVisible" :title="selectedEntry?.word || ''" size="md">
      <div v-if="selectedEntry" class="word-detail">
        <div class="detail-header">
          <div>
            <h2 class="detail-word-title">{{ selectedEntry.word }}</h2>
            <div v-if="selectedEntry.payload?.phonetic" class="detail-phonetic-row">
              <span v-if="selectedEntry.payload.phonetic.uk" class="detail-phonetic">
                英 /{{ selectedEntry.payload.phonetic.uk }}/
                <button
                  v-if="selectedEntry.payload.phonetic.ukAudio"
                  class="audio-btn"
                  title="播放英式发音"
                  @click="playAudio(selectedEntry.payload.phonetic.ukAudio)"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                    <path d="M15.54 8.46a5 5 0 010 7.07" />
                    <path d="M19.07 4.93a10 10 0 010 14.14" />
                  </svg>
                </button>
              </span>
              <span v-if="selectedEntry.payload.phonetic.us" class="detail-phonetic">
                美 /{{ selectedEntry.payload.phonetic.us }}/
                <button
                  v-if="selectedEntry.payload.phonetic.usAudio"
                  class="audio-btn"
                  title="播放美式发音"
                  @click="playAudio(selectedEntry.payload.phonetic.usAudio)"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                    <path d="M15.54 8.46a5 5 0 010 7.07" />
                    <path d="M19.07 4.93a10 10 0 010 14.14" />
                  </svg>
                </button>
              </span>
            </div>
          </div>
        </div>

        <!-- Chinese translations -->
        <div v-if="selectedEntry.payload?.translations?.length" class="detail-section">
          <h4>中文释义</h4>
          <div v-for="(t, i) in selectedEntry.payload.translations" :key="i" class="detail-translation">
            <span class="pos" v-if="t.pos">{{ t.pos }}</span>
            <span>{{ t.cn }}</span>
          </div>
        </div>

        <!-- English definitions -->
        <div v-if="selectedEntry.payload?.definitions?.length" class="detail-section">
          <h4>英文释义</h4>
          <div v-for="(d, i) in selectedEntry.payload.definitions" :key="i" class="detail-definition">
            <span class="pos" v-if="d.pos">{{ d.pos }}</span>
            <span>{{ d.en }}</span>
            <div v-if="d.synonyms?.length" class="detail-synonyms">
              <span class="syn-label">同义词: </span>
              <BaseTag v-for="syn in d.synonyms" :key="syn" size="sm">{{ syn }}</BaseTag>
            </div>
          </div>
        </div>

        <!-- Examples -->
        <div v-if="selectedEntry.payload?.examples?.length" class="detail-section">
          <h4>例句</h4>
          <div v-for="(ex, i) in selectedEntry.payload.examples" :key="i" class="detail-example">
            <div class="example-row">
              <p class="example-en">{{ ex.en }}</p>
              <button
                class="audio-btn audio-btn--inline"
                title="播放例句朗读"
                @click="speakText(ex.en, 'en-US')"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                  <path d="M15.54 8.46a5 5 0 010 7.07" />
                  <path d="M19.07 4.93a10 10 0 010 14.14" />
                </svg>
              </button>
            </div>
            <p class="example-zh">{{ ex.cn }}</p>
          </div>
        </div>

        <!-- Synonyms -->
        <div v-if="selectedEntry.payload?.synonyms?.length" class="detail-section">
          <h4>同义词</h4>
          <div class="tag-list">
            <BaseTag v-for="syn in selectedEntry.payload.synonyms" :key="syn" size="sm">{{ syn }}</BaseTag>
          </div>
        </div>

        <!-- Exams -->
        <div v-if="selectedEntry.payload?.exams?.length" class="detail-section">
          <h4>考试范围</h4>
          <div class="tag-list">
            <BaseTag v-for="exam in selectedEntry.payload.exams" :key="exam" size="sm">{{ exam }}</BaseTag>
          </div>
        </div>
      </div>
      <template #footer>
        <BaseButton variant="secondary" @click="detailVisible = false">关闭</BaseButton>
      </template>
    </BaseModal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { PageHeader, BaseInput, BaseButton, BaseModal, BaseTag, Skeleton, EmptyState } from '../components'
import { vocabularyApi, type DictionaryEntry } from '../api/vocabulary'

const entries = ref<DictionaryEntry[]>([])
const loading = ref(false)
const searchQuery = ref('')
const page = ref(1)
const limit = ref(50)
const total = ref(0)
const totalPages = ref(0)
const detailVisible = ref(false)
const selectedEntry = ref<DictionaryEntry | null>(null)

let searchTimer: ReturnType<typeof setTimeout> | null = null

const visiblePages = computed(() => {
  const pages: number[] = []
  const start = Math.max(1, page.value - 3)
  const end = Math.min(totalPages.value, page.value + 3)
  for (let i = start; i <= end; i++) pages.push(i)
  return pages
})

async function fetchList() {
  loading.value = true
  try {
    const res = await vocabularyApi.getDictionaryList({
      page: page.value,
      limit: limit.value,
      keyword: searchQuery.value || undefined,
    })
    entries.value = res.items
    total.value = res.total
    page.value = res.page
    totalPages.value = res.totalPages
  } catch (e) {
    console.error('Failed to fetch dictionary:', e)
  } finally {
    loading.value = false
  }
}

function onSearchInput() {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    page.value = 1
    fetchList()
  }, 300)
}

function changePage(p: number) {
  page.value = p
  fetchList()
}

function showDetail(entry: DictionaryEntry) {
  selectedEntry.value = entry
  detailVisible.value = true
}

// ── 音频播放 ────────────────────────────────────────────────────

let currentAudio: HTMLAudioElement | null = null

/** 播放有道词典音频 URL */
function playAudio(url: string) {
  if (!url) return
  // 停止当前播放
  if (currentAudio) {
    currentAudio.pause()
    currentAudio = null
  }
  // 有道 URL 中有双重编码（%2526 → %26），需要先解码一次
  const decodedUrl = decodeURIComponent(url)
  const audio = new Audio(decodedUrl)
  currentAudio = audio
  audio.play().catch((e) => {
    console.warn('Audio playback failed:', e)
    // fallback: 用 TTS
    speakText(selectedEntry.value?.word || '', 'en-US')
  })
  audio.onended = () => {
    currentAudio = null
  }
}

/** 用浏览器 TTS 播放文本（例句朗读 fallback） */
function speakText(text: string, lang: string = 'en-US') {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.lang = lang
  utterance.rate = 0.85
  window.speechSynthesis.speak(utterance)
}

onMounted(() => {
  fetchList()
})

onUnmounted(() => {
  if (searchTimer) clearTimeout(searchTimer)
  if (currentAudio) {
    currentAudio.pause()
    currentAudio = null
  }
})
</script>

<style scoped>
.vocabulary-page {
  padding: var(--space-6);
  max-width: 1200px;
  margin: 0 auto;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  margin-bottom: var(--space-4);
}

.page-info {
  font-size: 0.8125rem;
  color: var(--color-text-muted);
  white-space: nowrap;
}

/* ── Word Grid ───────────────────────────────────────────────── */

.word-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: var(--space-3);
}

.word-card {
  padding: var(--space-3) var(--space-4);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: box-shadow 0.15s ease, border-color 0.15s ease;
}

.word-card:hover {
  border-color: var(--color-border-strong);
  box-shadow: var(--shadow-sm);
}

.word-card-header {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
  margin-bottom: var(--space-1);
}

.word-card-text {
  font-weight: 700;
  font-size: 1rem;
  color: var(--color-text);
}

.word-card-phonetic {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  font-family: var(--font-mono);
}

.word-card-translation {
  font-size: 0.8125rem;
  color: var(--color-text-muted);
  margin-bottom: var(--space-1);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.word-card-exams {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

/* ── Pagination ──────────────────────────────────────────────── */

.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
  margin-top: var(--space-6);
}

.page-numbers {
  display: flex;
  gap: 4px;
}

.page-btn {
  min-width: 32px;
  height: 32px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text-muted);
  font-size: 0.8125rem;
  cursor: pointer;
  transition: all 0.15s ease;
}

.page-btn:hover {
  border-color: var(--color-border-strong);
  color: var(--color-text);
}

.page-btn.active {
  background: var(--color-primary);
  color: var(--color-primary-foreground);
  border-color: var(--color-primary);
}

/* ── Detail Modal ────────────────────────────────────────────── */

.word-detail {
  max-height: 60vh;
  overflow-y: auto;
}

.detail-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding-bottom: var(--space-3);
  margin-bottom: var(--space-3);
  border-bottom: 1px solid var(--color-border);
}

.detail-word-title {
  font-size: 1.5rem;
  font-weight: 700;
  margin: 0;
}

.detail-phonetic-row {
  display: flex;
  gap: var(--space-4);
  margin-top: 4px;
  flex-wrap: wrap;
}

.detail-phonetic {
  font-size: 0.8125rem;
  color: var(--color-text-muted);
  font-family: var(--font-mono);
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.detail-section {
  margin-bottom: var(--space-4);
}

.detail-section h4 {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: var(--space-2);
}

.detail-translation,
.detail-definition {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
  margin-bottom: var(--space-1);
  font-size: 0.875rem;
}

.pos {
  display: inline-block;
  min-width: 36px;
  font-size: 0.75rem;
  color: var(--color-text-muted);
  font-style: italic;
  flex-shrink: 0;
}

.detail-synonyms {
  margin-left: 44px;
  margin-top: 4px;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.syn-label {
  font-size: 0.75rem;
  color: var(--color-text-muted);
}

.detail-example {
  padding: var(--space-2) var(--space-3);
  background: var(--color-surface-muted);
  border-radius: var(--radius-sm);
  margin-bottom: var(--space-2);
}

.example-row {
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
}

.example-en {
  font-size: 0.875rem;
  font-style: italic;
  color: var(--color-text);
  margin: 0;
  flex: 1;
}

.example-zh {
  font-size: 0.8125rem;
  color: var(--color-text-muted);
  margin: 4px 0 0;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

/* ── Audio Button ────────────────────────────────────────────── */

.audio-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text-muted);
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease, border-color 0.15s ease;
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  padding: 0;
}

.audio-btn:hover {
  background: var(--color-surface-muted);
  color: var(--color-primary);
  border-color: var(--color-border-strong);
}

.audio-btn--inline {
  margin-top: 1px;
}

/* ── Responsive ─────────────────────────────────────────────── */
@media (max-width: 768px) {
  .vocabulary-page { padding: var(--space-3); }
  .word-grid { grid-template-columns: 1fr; }
}
</style>
