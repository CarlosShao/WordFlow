<template>
  <div class="detail-page">
    <!-- Header -->
    <header class="detail-header">
      <button class="back-btn" @click="goBack">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>

      <div class="header-info" v-if="contentDetail">
        <h1 class="header-title">{{ contentDetail.title }}</h1>

        <div class="header-meta">
          <span :class="['type-badge', `badge-${normalizedType}`]">
            {{ getTypeLabel(normalizedType) }}
          </span>
          <span :class="['difficulty-badge', `diff-${contentDetail.difficulty}`]">
            {{ getDifficultyLabel(contentDetail.difficulty) }}
          </span>
          <span v-if="contentDetail.source" class="source-badge">{{ contentDetail.source }}</span>
          <a
            v-if="contentDetail.sourceUrl"
            :href="contentDetail.sourceUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="external-link"
            title="查看原文"
          >
            查看原文
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
              <polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" />
            </svg>
          </a>
        </div>
      </div>

      <div v-if="loading && !contentDetail" class="skeleton-header">
        <Skeleton variant="text" style="width: 60%; height: 28px;" />
        <Skeleton variant="text" style="width: 30%; height: 16px; margin-top: 8px;" />
      </div>
    </header>

    <!-- Error State -->
    <div v-if="error" class="error-state">
      <p>{{ error }}</p>
      <button @click="fetchContent">重试</button>
    </div>

    <!-- Main Content -->
    <main v-if="contentDetail" class="detail-main">
      <!-- Video Player (for VIDEO type) -->
      <section v-if="normalizedType === 'video' && contentDetail.videoUrl" class="media-section video-section">
        <div class="video-wrapper">
          <iframe
            v-if="isEmbedUrl(contentDetail.videoUrl)"
            :src="contentDetail.videoUrl"
            frameborder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowfullscreen
            class="video-embed"
          ></iframe>
          <video
            v-else
            controls
            :src="contentDetail.videoUrl"
            class="video-native"
            preload="metadata"
          >
            您的浏览器不支持视频播放
          </video>
        </div>
      </section>

      <!-- Audio Player (for PODCAST type) -->
      <section v-if="normalizedType === 'podcast' && contentDetail.audioUrl" class="media-section audio-section">
        <div class="audio-player">
          <audio controls :src="contentDetail.audioUrl" preload="metadata" ref="audioRef">
            您的浏览器不支持音频播放
          </audio>
        </div>
      </section>

      <!-- Summary -->
      <section v-if="contentDetail.summary" class="summary-section">
        <h2>摘要</h2>
        <p>{{ contentDetail.summary }}</p>
      </section>

      <!-- Article / Transcript Content -->
      <section v-if="contentDetail.content || contentDetail.summary" class="article-section">
        <div class="article-tabs">
          <button
            :class="['tab-btn', { active: activeTab === 'original' }]"
            @click="activeTab = 'original'"
          >
            原文
          </button>
          <button
            v-if="contentDetail.translation"
            :class="['tab-btn', { active: activeTab === 'translation' }]"
            @click="activeTab = 'translation'"
          >
            翻译
          </button>
          <button
            :class="['tab-btn', { active: activeTab === 'bilingual' }]"
            @click="activeTab = 'bilingual'"
          >
            双语对照
          </button>
        </div>

        <div class="article-body">
          <!-- Original Text -->
          <div v-show="activeTab === 'original'" class="tab-content original-text">
            <div v-html="formatContent(contentDetail.content)"></div>
          </div>

          <!-- Translation -->
          <div v-show="activeTab === 'translation'" class="tab-content translation-text">
            <div v-if="isTranslationAdequate" v-html="formatTranslation(contentDetail.translation)"></div>
            <div v-else class="translation-hint">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 16v-4M12 8h.01"/>
              </svg>
              <span>该内容的中文翻译尚不完整，仅显示摘要。完整翻译将在后续更新中补充。</span>
            </div>
          </div>

          <!-- Bilingual View -->
          <div v-show="activeTab === 'bilingual'" class="tab-content bilingual-text">
            <template v-if="getBilingualParagraphs().length > 0">
              <div v-for="(para, idx) in getBilingualParagraphs()" :key="idx" class="bilingual-block">
                <div class="bi-en">{{ para.en }}</div>
                <div class="bi-zh">{{ para.zh || '（暂无对应翻译）' }}</div>
              </div>
            </template>
            <div v-else class="translation-hint">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 16v-4M12 8h.01"/>
              </svg>
              <span>双语对照需要完整的英文原文和中文翻译，当前数据不足。</span>
            </div>
          </div>
        </div>
      </section>

      <!-- No Content Fallback -->
      <section v-else class="no-content-section">
        <div class="no-content-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
          </svg>
        </div>
        <p>该内容暂无正文文本</p>
        <a v-if="contentDetail?.sourceUrl" :href="contentDetail.sourceUrl" target="_blank" class="link-primary">
          访问原始来源 →
        </a>
      </section>

      <!-- AI Question Generator -->
      <section class="ai-section">
        <AIQuestionGenerator :content-id="route.params.id as string" />
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { Skeleton, AIQuestionGenerator } from '../components'
import { contentApi } from '../api/content'
import type { ContentType, CEFRLevel } from '../types'

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const error = ref('')
const contentDetail = ref<any>(null)
const audioRef = ref<HTMLAudioElement | null>(null)
const activeTab = ref<'original' | 'translation' | 'bilingual'>('original')

async function fetchContent() {
  if (!route.params.id) return

  loading.value = true
  error.value = ''

  try {
    const res = await contentApi.getById(route.params.id as string)
    contentDetail.value = res
  } catch (err: any) {
    error.value = err.message || '加载内容失败'
  } finally {
    loading.value = false
  }
}

onMounted(fetchContent)

watch(() => route.params.id, fetchContent)

function goBack() {
  router.push('/content')
}

function getTypeLabel(type: ContentType): string {
  const labels: Record<ContentType, string> = {
    article: '文章',
    video: '视频',
    podcast: '播客'
  }
  return labels[type] || type
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

function isEmbedUrl(url: string): boolean {
  return url.includes('youtube.com/embed') || url.includes('player.vimeo')
}

function formatContent(text: string): string {
  // Fallback to summary if content is empty
  const raw = (text || contentDetail.value?.summary || '').trim()
  if (!raw) return ''
  // Convert plain text to HTML paragraphs
  return raw
    .split('\n\n')
    .filter(p => p.trim())
    .map(p => `<p>${p.replace(/\n/g, '<br/>')}</p>`)
    .join('')
}

function formatTranslation(text: string): string {
  // Translation is already paragraph-formatted; just convert to HTML
  return text
    .split('\n\n')
    .filter(p => p.trim())
    .map(p => `<p>${p.replace(/\n/g, '<br/>')}</p>`)
    .join('')
}

/** Check if translation looks like a full translation (not just a one-line summary) */
const isTranslationAdequate = computed(() => {
  if (!contentDetail.value?.translation) return false
  const t = contentDetail.value.translation.trim()
  // Adequate if it has multiple sentences or is long enough to be a real translation
  const sentenceCount = (t.match(/[。！？.!?]/g) || []).length
  return sentenceCount >= 3 || t.length > 80
})

// Backend returns uppercase ContentType enum (VIDEO/PODCAST/ARTICLE),
// frontend uses lowercase. Normalize here so templates can compare reliably.
const normalizedType = computed(() => (contentDetail.value?.type || '').toLowerCase())

function getBilingualParagraphs(): Array<{ en: string; zh: string }> {
  if (!contentDetail.value?.content || !contentDetail.value?.translation) return []

  // Seed data format: both content and translation use \n as line separator within paragraphs,
  // and \n\n between major sections. Split by \n first for line-by-line alignment.
  const enLines = contentDetail.value.content.split(/\n+/).filter(l => l.trim())
  const zhLines = contentDetail.value.translation.split(/\n+/).filter(l => l.trim())

  const result: Array<{ en: string; zh: string }> = []
  const maxLen = Math.max(enLines.length, zhLines.length)
  for (let i = 0; i < maxLen; i++) {
    result.push({
      en: enLines[i]?.trim() || '',
      zh: zhLines[i]?.trim() || ''
    })
  }
  return result
}
</script>

<style scoped>
.detail-page {
  max-width: 860px;
  margin: 0 auto;
  padding: var(--space-6);
  min-height: calc(100vh - 64px);
}

/* ── Header ─────────────────────────────────────────────────── */
.detail-header {
  display: flex;
  align-items: flex-start;
  gap: var(--space-4);
  margin-bottom: var(--space-6);
}

.back-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text);
  cursor: pointer;
  transition: all 0.16s ease;
  flex-shrink: 0;
  margin-top: 2px;
}

.back-btn:hover {
  background: var(--color-surface-muted);
  border-color: var(--color-border-strong);
}

.header-info {
  flex: 1;
  min-width: 0;
}

.header-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-text);
  margin: 0 0 var(--space-3);
  line-height: 1.3;
  font-family: var(--font-serif);
}

.header-meta {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.type-badge {
  display: inline-flex;
  padding: 2px 10px;
  font-size: 0.75rem;
  font-weight: 700;
  border-radius: var(--radius-sm);
  letter-spacing: 0.02em;
}
.badge-article { background: var(--color-brand-subtle); color: var(--color-primary); }
.badge-video { background: var(--color-danger-50); color: var(--color-danger-600); }
.badge-podcast { background: var(--color-success-50); color: var(--color-success-600); }

.difficulty-badge {
  display: inline-flex;
  padding: 2px 10px;
  font-size: 0.75rem;
  font-weight: 600;
  border-radius: var(--radius-sm);
}
.diff-A1, .diff-A2 { background: var(--color-success-50); color: var(--color-success-700); }
.diff-B1, .diff-B2 { background: var(--color-brand-subtle); color: var(--color-brand-700); }
.diff-C1, .diff-C2 { background: var(--color-danger-50); color: var(--color-danger-600); }

.source-badge {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  background: var(--color-surface-muted);
  padding: 2px 8px;
  border-radius: var(--radius-sm);
}

.external-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.75rem;
  color: var(--color-primary);
  text-decoration: none;
  transition: color 0.16s;
}

.external-link:hover {
  color: var(--color-brand-700);
  text-decoration: underline;
}

.skeleton-header {
  flex: 1;
  padding-top: 4px;
}

/* ── Error ──────────────────────────────────────────────────── */
.error-state {
  text-align: center;
  padding: var(--space-8) 0;
  color: var(--color-danger-600);
}

.error-state button {
  margin-top: var(--space-3);
  padding: var(--space-2) var(--space-4);
  border: none;
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  cursor: pointer;
}

/* ── Media Sections ─────────────────────────────────────────── */
.media-section {
  margin-bottom: var(--space-6);
  border-radius: var(--radius-md);
  overflow: hidden;
  box-shadow: var(--shadow-md);
}

.video-wrapper {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 9;
  background: #000;
}

.video-embed,
.video-native {
  width: 100%;
  height: 100%;
  display: block;
}

.audio-section {
  background: var(--color-brand-subtle);
  border: 1px solid var(--color-border);
  padding: var(--space-4);
}

.audio-player {
  max-width: 600px;
  margin: 0 auto;
}

.audio-player audio {
  width: 100%;
  height: 44px;
  border-radius: var(--radius-sm);
}

/* ── Summary ────────────────────────────────────────────────── */
.summary-section {
  margin-bottom: var(--space-6);
  padding: var(--space-4);
  background: var(--color-surface);
  border-left: 3px solid var(--color-primary);
  border-radius: 0 var(--radius-md) var(--radius-md) 0;
}

.summary-section h2 {
  font-size: 0.875rem;
  font-weight: 700;
  color: var(--color-primary);
  margin: 0 0 var(--space-2);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.summary-section p {
  font-size: 0.9375rem;
  line-height: 1.7;
  color: var(--color-text-muted);
  margin: 0;
}

/* ── Article Section ───────────────────────────────────────── */
.article-section {
  margin-bottom: var(--space-6);
}

.article-tabs {
  display: flex;
  gap: var(--space-1);
  margin-bottom: var(--space-4);
  border-bottom: 2px solid var(--color-border);
  padding-bottom: 0;
}

.tab-btn {
  padding: var(--space-2) var(--space-4);
  font-size: 0.875rem;
  font-weight: 500;
  font-family: var(--font-sans);
  color: var(--color-text-muted);
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  margin-bottom: -2px;
  cursor: pointer;
  transition: all 0.16s ease;
}

.tab-btn:hover {
  color: var(--color-text);
}

.tab-btn.active {
  color: var(--color-primary);
  border-bottom-color: var(--color-primary);
  font-weight: 600;
}

.article-body {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.tab-content {
  padding: var(--space-6);
}

.original-text {
  font-size: 1.05rem;
  line-height: 1.85;
  color: var(--color-text);
}

.original-text :deep(p) {
  margin: 0 0 var(--space-4);
}

.original-text :deep(p:last-child) {
  margin-bottom: 0;
}

.translation-text {
  font-size: 1rem;
  line-height: 1.8;
  color: var(--color-text-muted);
}

.translation-hint {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-4) var(--space-5);
  background: var(--color-surface-muted);
  border-radius: var(--radius-md);
  color: var(--color-text-muted);
  font-size: 0.9375rem;
  line-height: 1.6;
}

.translation-hint svg {
  flex-shrink: 0;
  color: var(--color-brand-subtle);
}

.bilingual-text {
  padding: 0;
}

.bilingual-block {
  padding: var(--space-4) var(--space-6);
  border-bottom: 1px solid var(--color-border);
}

.bilingual-block:last-child {
  border-bottom: none;
}

.bi-en {
  font-size: 1rem;
  line-height: 1.75;
  color: var(--color-text);
  margin-bottom: var(--space-2);
}

.bi-zh {
  font-size: 0.9375rem;
  line-height: 1.7;
  color: var(--color-text-muted);
  padding-left: var(--space-4);
  border-left: 2px solid var(--color-border);
}

/* ── No Content ─────────────────────────────────────────────── */
.no-content-section {
  text-align: center;
  padding: var(--space-8);
  color: var(--color-text-muted);
}

.no-content-icon {
  opacity: 0.3;
  margin-bottom: var(--space-3);
}

.link-primary {
  display: inline-block;
  margin-top: var(--space-3);
  color: var(--color-primary);
  text-decoration: none;
  font-weight: 500;
}

.link-primary:hover {
  text-decoration: underline;
}

/* ── AI Section ─────────────────────────────────────────────── */
.ai-section {
  margin-top: var(--space-6);
}

/* ── Responsive ─────────────────────────────────────────────── */
@media (max-width: 768px) {
  .detail-page {
    padding: var(--space-4);
  }

  .header-title {
    font-size: 1.25rem;
  }

  .tab-content {
    padding: var(--space-4);
  }

  .original-text {
    font-size: 1rem;
  }
}
</style>
