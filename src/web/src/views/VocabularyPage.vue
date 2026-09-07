<template>
  <div class="vocabulary-page">
    <!-- Header with quick access to wordbook -->
    <div class="page-header-row">
      <PageHeader
        title="词汇"
        :subtitle="`词典库 · 共 ${total.toLocaleString()} 词 · 点「+ 生词本」收藏后可用于 AI 练习`"
      />
      <BaseButton variant="primary" size="sm" @click="router.push('/wordbook')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
        </svg>
        我的生词本
      </BaseButton>
    </div>

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
          <button
            :class="['add-wordbook-btn', { added: addedWords.has(entry.word) }]"
            :title="addedWords.has(entry.word) ? '已在生词本' : '加入生词本（可用于 AI 练习）'"
            @click.stop="addToWordbook(entry)"
          >
            {{ addedWords.has(entry.word) ? '✓ 已加入' : '+ 生词本' }}
          </button>
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

        <!-- Synonyms / Antonyms -->
        <div v-if="selectedEntry.payload?.synonyms?.length || selectedEntry.payload?.antonyms?.length" class="detail-section">
          <h4>同义词 / 反义词</h4>
          <div v-if="selectedEntry.payload.synonyms?.length" class="tag-row">
            <span class="tag-row-label">近</span>
            <BaseTag v-for="syn in selectedEntry.payload.synonyms" :key="syn" variant="primary" size="sm">{{ syn }}</BaseTag>
          </div>
          <div v-if="selectedEntry.payload.antonyms?.length" class="tag-row">
            <span class="tag-row-label">反</span>
            <BaseTag v-for="ant in selectedEntry.payload.antonyms" :key="ant" variant="danger" size="sm">{{ ant }}</BaseTag>
          </div>
        </div>

        <!-- Related Words (派生词) -->
        <div v-if="selectedEntry.payload?.relatedWords?.length" class="detail-section">
          <h4>派生词</h4>
          <div class="related-words-list">
            <div v-for="(rw, i) in selectedEntry.payload.relatedWords" :key="i" class="related-word-item">
              <span v-if="rw.pos" class="pos">{{ rw.pos }}</span>
              <span class="related-word">{{ rw.word }}</span>
              <span v-if="rw.translation" class="related-translation">{{ rw.translation }}</span>
            </div>
          </div>
        </div>

        <!-- Phrases (词组短语) -->
        <div v-if="selectedEntry.payload?.phrases?.length" class="detail-section">
          <h4>词组短语</h4>
          <div class="phrases-list">
            <div v-for="(p, i) in selectedEntry.payload.phrases" :key="i" class="phrase-item">
              <span class="phrase-text">{{ p.phrase }}</span>
              <span class="phrase-translations">
                <template v-for="(pt, j) in p.translations" :key="j">
                  <span v-if="pt.pos" class="pos">{{ pt.pos }}</span>
                  <span class="phrase-cn">{{ pt.cn }}</span>
                  <span v-if="j < p.translations.length - 1" class="phrase-sep">；</span>
                </template>
              </span>
              <span v-if="p.source" class="phrase-source">{{ p.source }}</span>
            </div>
          </div>
        </div>

        <!-- Collins (完整柯林斯英汉双解 — 按词性分组的全量义项) -->
        <div v-if="selectedEntry.payload?.extended?.collins?.entries?.length" class="detail-section">
          <h4>
            柯林斯英汉双解
            <span v-if="selectedEntry.payload.extended.collins.star" class="collins-star" :title="`柯林斯 ${selectedEntry.payload.extended.collins.star} 星级核心词`">
              <span v-for="n in Number(selectedEntry.payload.extended.collins.star)" :key="n">★</span>
            </span>
            <span class="collins-count">{{ selectedEntry.payload.extended.collins.entries.length }} 个义项</span>
          </h4>
          <div
            v-for="(entry, i) in collinsVisibleEntries"
            :key="i"
            class="collins-entry"
          >
            <div class="collins-entry-header">
              <span v-if="entry.pos" class="collins-pos">{{ entry.pos }}</span>
              <span v-if="entry.posTips" class="collins-postips">{{ entry.posTips }}</span>
            </div>
            <p class="collins-entry-def">{{ entry.def }}</p>
            <div v-for="(ex, j) in entry.examples" :key="j" class="collins-example">
              <p class="collins-en">{{ ex.en }}</p>
              <p class="collins-cn">{{ ex.cn }}</p>
            </div>
          </div>
          <button
            v-if="collinsEntryCount > COLLINS_COLLAPSE_THRESHOLD"
            class="collins-toggle"
            @click="collinsExpanded = !collinsExpanded"
          >
            {{ collinsExpanded ? '收起' : `展开剩余 ${collinsEntryCount - COLLINS_COLLAPSE_THRESHOLD} 个义项` }}
          </button>
        </div>

        <!-- Collins Primary (柯林斯精选 — 精简核心义项，含独立发音) -->
        <div v-if="selectedEntry.payload?.extended?.collinsPrimary?.senses?.length" class="detail-section">
          <h4>
            柯林斯精选
            <span v-if="selectedEntry.payload.extended.collinsPrimary.phonetic" class="collins-phonetic">
              /{{ selectedEntry.payload.extended.collinsPrimary.phonetic }}/
            </span>
            <button
              v-if="selectedEntry.payload.extended.collinsPrimary.audioUrl"
              class="audio-btn"
              title="播放柯林斯发音"
              @click="playAudio(selectedEntry.payload.extended.collinsPrimary.audioUrl)"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M15.54 8.46a5 5 0 010 7.07" />
                <path d="M19.07 4.93a10 10 0 010 14.14" />
              </svg>
            </button>
          </h4>
          <div v-for="(sense, i) in selectedEntry.payload.extended.collinsPrimary.senses" :key="i" class="collins-sense">
            <div class="collins-sense-header">
              <span v-if="sense.pos" class="pos">{{ sense.pos }}</span>
              <span class="collins-def">{{ sense.def }}</span>
            </div>
            <div v-for="(c, j) in sense.examples" :key="j" class="collins-example">
              <p class="collins-en">{{ c.en }}</p>
              <p class="collins-cn">{{ c.cn }}</p>
            </div>
          </div>
        </div>

        <!-- Discrimination (辨析) -->
        <div v-if="selectedEntry.payload?.extended?.discrimination?.length" class="detail-section">
          <h4>词语辨析</h4>
          <div v-for="(d, i) in selectedEntry.payload.extended.discrimination" :key="i" class="discrimination-block">
            <p v-if="d.tran" class="discrimination-tran">{{ d.tran }}</p>
            <div v-for="(u, j) in d.usages" :key="j" class="discrimination-usage">
              <BaseTag size="sm">{{ u.word }}</BaseTag>
              <span>{{ u.usage }}</span>
            </div>
          </div>
        </div>

        <!-- Etymology (词源) -->
        <div v-if="selectedEntry.payload?.extended?.etymology" class="detail-section">
          <h4>词源</h4>
          <p class="etymology-text">{{ selectedEntry.payload.extended.etymology }}</p>
        </div>

        <!-- Encyclopedia (百科) -->
        <div v-if="selectedEntry.payload?.extended?.encyclopedia" class="detail-section">
          <h4>百科释义</h4>
          <p class="encyclopedia-text">{{ selectedEntry.payload.extended.encyclopedia.summary }}</p>
          <a
            v-if="selectedEntry.payload.extended.encyclopedia.sourceUrl"
            class="encyclopedia-link"
            :href="selectedEntry.payload.extended.encyclopedia.sourceUrl"
            target="_blank"
            rel="noopener"
          >{{ selectedEntry.payload.extended.encyclopedia.sourceName }} →</a>
        </div>

        <!-- Exams -->
        <div v-if="selectedEntry.payload?.exams?.length" class="detail-section">
          <h4>考试范围</h4>
          <div class="tag-list">
            <BaseTag v-for="exam in selectedEntry.payload.exams" :key="exam" size="sm">{{ exam }}</BaseTag>
          </div>
        </div>

        <!-- Source & data quality -->
        <div v-if="selectedEntry.payload?.source || selectedEntry.payload?.extended?.unavailable?.length" class="detail-section">
          <h4>数据来源</h4>
          <div v-if="selectedEntry.payload.source" class="tag-row">
            <BaseTag variant="muted" size="sm">{{ selectedEntry.payload.source }}</BaseTag>
          </div>
          <div v-if="selectedEntry.payload.extended?.unavailable?.length" class="data-note">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="9"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span>以下数据未采集：{{ selectedEntry.payload.extended.unavailable.join('、') }}</span>
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
import { ref, computed, onMounted, onUnmounted, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { PageHeader, BaseInput, BaseButton, BaseModal, BaseTag, Skeleton, EmptyState } from '../components'
import { vocabularyApi, type DictionaryEntry } from '../api/vocabulary'
import { useToast } from '../composables/useToast'

const router = useRouter()
const toast = useToast()

// 已加入生词本的词（页面级标记，用于按钮态）
const addedWords = reactive(new Set<string>())
const addingWords = reactive(new Set<string>())

// 完整柯林斯义项可能很多（实测 mind/hand 达 37 个），超过阈值折叠
const COLLINS_COLLAPSE_THRESHOLD = 8
const collinsExpanded = ref(false)

const collinsEntryCount = computed(
  () => selectedEntry.value?.payload?.extended?.collins?.entries?.length ?? 0
)

/** 折叠时只取前 N 个义项；展开则全取 */
const collinsVisibleEntries = computed(() => {
  const entries = selectedEntry.value?.payload?.extended?.collins?.entries ?? []
  if (collinsExpanded.value || entries.length <= COLLINS_COLLAPSE_THRESHOLD) return entries
  return entries.slice(0, COLLINS_COLLAPSE_THRESHOLD)
})

/** 把词典词条收藏进生词本（带释义/音标/例句，练习出题依赖这些字段） */
async function addToWordbook(entry: DictionaryEntry) {
  if (addedWords.has(entry.word) || addingWords.has(entry.word)) return
  addingWords.add(entry.word)
  try {
    const payload = entry.payload as {
      translations?: { cn?: string }[]
      phonetic?: { us?: string }
      examples?: { en?: string }[]
    } | null
    await vocabularyApi.addWord(entry.word, {
      translation: payload?.translations?.map(t => t.cn).join('；') || '',
      phonetic: payload?.phonetic?.us,
      examples: (payload?.examples ?? []).map(e => e.en).filter((e): e is string => !!e).slice(0, 2),
    })
    addedWords.add(entry.word)
    toast.success(`「${entry.word}」已加入生词本`)
  } catch (e) {
    const msg = e instanceof Error ? e.message : '加入失败'
    // 后端对重复收藏返回 409「该词汇已在你的词表中」
    if (msg.includes('已在')) addedWords.add(entry.word)
    toast.error(msg)
  } finally {
    addingWords.delete(entry.word)
  }
}

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
  // 切换词条时重置柯林斯折叠态，避免沿用上一个词的展开状态
  collinsExpanded.value = false
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

/* 收藏进生词本按钮 */
.add-wordbook-btn {
  margin-left: auto;
  flex-shrink: 0;
  padding: 3px 10px;
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--color-primary);
  background: transparent;
  border: 1px solid var(--color-primary);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.16s ease;
}

.add-wordbook-btn:hover {
  background: var(--color-primary);
  color: var(--color-primary-foreground);
}

.add-wordbook-btn.added {
  color: var(--color-success-600);
  border-color: var(--color-success-600);
  background: var(--color-success-50);
  cursor: default;
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

/* ── Page Header Row (with quick action button) ─────────────── */

.page-header-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
  flex-wrap: wrap;
}

.page-header-row :deep(.page-header) {
  margin-bottom: 0;
}

/* ── Tag Row (syn / ant side-by-side) ───────────────────────── */

.tag-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  margin-bottom: 4px;
}

.tag-row-label {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 22px;
  height: 22px;
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--color-text-muted);
  background: var(--color-surface-muted);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  margin-right: 4px;
}

/* ── Related Words ──────────────────────────────────────────── */

.related-words-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.related-word-item {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
  font-size: 0.8125rem;
  padding: 4px 8px;
  background: var(--color-surface-muted);
  border-radius: var(--radius-sm);
}

.related-word {
  font-weight: 600;
  color: var(--color-text);
}

.related-translation {
  color: var(--color-text-muted);
  margin-left: auto;
  font-size: 0.75rem;
}

/* ── Phrases ────────────────────────────────────────────────── */

.phrases-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.phrase-item {
  padding: 6px 10px;
  background: var(--color-surface-muted);
  border-radius: var(--radius-sm);
  font-size: 0.8125rem;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.phrase-text {
  font-weight: 600;
  color: var(--color-text);
}

.phrase-translations {
  color: var(--color-text-muted);
}

.phrase-cn {
  margin-right: 4px;
}

.phrase-sep {
  color: var(--color-text-muted);
  margin-right: 4px;
}

.phrase-source {
  display: inline-block;
  margin-top: 2px;
  font-size: 0.6875rem;
  color: var(--color-text-muted);
  font-style: italic;
}

/* ── Collins (full bilingual) ───────────────────────────────── */

.collins-star {
  display: inline-flex;
  align-items: center;
  margin-left: 6px;
  font-size: 0.75rem;
  letter-spacing: 1px;
  color: var(--color-warning-600);
  text-transform: none;
}

.collins-count {
  display: inline-block;
  margin-left: 8px;
  font-weight: 400;
  text-transform: none;
  letter-spacing: 0;
  color: var(--color-text-muted);
  font-size: 0.6875rem;
}

.collins-entry {
  padding: var(--space-2) var(--space-3);
  background: var(--color-surface-muted);
  border-radius: var(--radius-sm);
  margin-bottom: 6px;
  border-left: 2px solid var(--color-warning-300);
}

.collins-entry-header {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
  margin-bottom: 4px;
}

.collins-pos {
  display: inline-block;
  padding: 1px 6px;
  font-size: 0.6875rem;
  font-weight: 700;
  color: var(--color-warning-700);
  background: var(--color-warning-50);
  border: 1px solid var(--color-warning-200);
  border-radius: 3px;
  font-style: normal;
}

.collins-postips {
  font-size: 0.6875rem;
  color: var(--color-text-muted);
}

.collins-entry-def {
  font-size: 0.875rem;
  color: var(--color-text);
  line-height: 1.65;
  margin: 0 0 4px;
}

.collins-toggle {
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--color-primary);
  background: transparent;
  border: 1px solid var(--color-primary);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.16s ease;
}

.collins-toggle:hover {
  background: var(--color-primary);
  color: var(--color-primary-foreground);
}

/* ── Collins Primary ────────────────────────────────────────── */

.collins-phonetic {
  display: inline-block;
  margin-left: 8px;
  font-weight: 400;
  text-transform: none;
  letter-spacing: 0;
  color: var(--color-text-muted);
  font-family: var(--font-mono);
  font-size: 0.75rem;
}

.detail-section h4 .audio-btn {
  margin-left: 4px;
  vertical-align: middle;
}

.collins-sense {
  padding: var(--space-2) var(--space-3);
  background: var(--color-surface-muted);
  border-radius: var(--radius-sm);
  margin-bottom: 6px;
  font-size: 0.875rem;
}

.collins-sense-header {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
  margin-bottom: 4px;
}

.collins-def {
  color: var(--color-text);
}

.collins-example {
  margin-top: 4px;
  padding-left: 44px;
}

.collins-en {
  font-size: 0.8125rem;
  font-style: italic;
  color: var(--color-text);
  margin: 0;
}

.collins-cn {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  margin: 2px 0 0;
}

/* ── Discrimination ─────────────────────────────────────────── */

.discrimination-block {
  padding: var(--space-2) var(--space-3);
  background: var(--color-surface-muted);
  border-radius: var(--radius-sm);
  margin-bottom: 6px;
}

.discrimination-tran {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-text);
  margin: 0 0 6px;
}

.discrimination-usage {
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
  font-size: 0.8125rem;
  color: var(--color-text-muted);
  margin-bottom: 4px;
}

/* ── Etymology / Encyclopedia ───────────────────────────────── */

.etymology-text,
.encyclopedia-text {
  font-size: 0.875rem;
  color: var(--color-text);
  line-height: 1.7;
  margin: 0;
  white-space: pre-wrap;
}

.encyclopedia-link {
  display: inline-block;
  margin-top: 6px;
  font-size: 0.75rem;
  color: var(--color-primary);
  text-decoration: none;
}

.encyclopedia-link:hover {
  text-decoration: underline;
}

/* ── Data Note ──────────────────────────────────────────────── */

.data-note {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  font-size: 0.75rem;
  color: var(--color-text-muted);
  padding: 6px 10px;
  background: var(--color-warning-50);
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-warning-200);
}

.data-note svg {
  flex-shrink: 0;
  margin-top: 1px;
  color: var(--color-warning-600);
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
