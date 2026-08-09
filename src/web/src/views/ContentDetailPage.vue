<template>
  <div class="content-detail-page">
    <!-- Loading -->
    <div v-if="contentStore.loading" class="detail-loading">
      <Skeleton variant="text" :lines="8" />
    </div>

    <!-- Not Found -->
    <EmptyState
      v-else-if="!content"
      title="内容未找到"
      description="该内容可能已被删除或不存在"
      icon="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M12 2a10 10 0 100 20 10 10 0 000-20z"
      action-text="返回内容列表"
      @action="goBack"
    />

    <!-- Content -->
    <template v-else>
      <!-- Top Bar -->
      <header class="top-bar">
        <div class="top-bar-left">
          <button class="back-btn" @click="goBack" title="返回">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 12H5" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
          </button>
          <h1 class="detail-title">{{ content.title }}</h1>
        </div>
        <div class="top-bar-right">
          <span class="source-badge">{{ content.source }}</span>
          <span :class="['difficulty-tag', `difficulty-${content.difficulty}`]">
            {{ content.difficulty }}
          </span>
          <span :class="['type-badge', `badge-${content.type}`]">
            {{ getTypeLabel(content.type) }}
          </span>
          <a v-if="content.sourceUrl" :href="content.sourceUrl" target="_blank" rel="noopener" class="source-link">
            查看原文 ↗
          </a>
        </div>
      </header>

      <!-- ── Article View ──────────────────────────────────────── -->
      <div v-if="content.type === 'article'" class="article-view">
        <!-- Article Controls -->
        <div class="article-controls">
          <ReadingTimer :word-count="content.wordCount || 0" />
          <TranslationToggle v-model="translationMode" />
        </div>

        <!-- Segments -->
        <div class="segments-list">
          <div v-for="segment in content.segments" :key="segment.id" class="segment-block">
            <!-- Segment Header -->
            <div v-if="segment.title" class="segment-header">
              <h2 class="segment-title">{{ segment.title }}</h2>
              <PronunciationBtn :text="segment.title" size="sm" />
            </div>

            <!-- English Content -->
            <div class="segment-content">
              <WordSelector @add-vocabulary="handleAddVocabulary" @word-selected="handleWordSelected">
                <p class="segment-text">{{ segment.content }}</p>
              </WordSelector>
            </div>

            <!-- Translation (bilingual or translated mode) -->
            <div v-if="translationMode !== 'original' && segment.translation" class="segment-translation">
              <p v-if="translationMode === 'bilingual'" class="translation-text bilingual">
                {{ segment.translation }}
              </p>
              <p v-else-if="translationMode === 'translated'" class="translation-text translated">
                {{ segment.translation }}
              </p>
            </div>

            <!-- Segment Practice -->
            <SegmentPractice
              v-if="getSegmentPractice(segment.id).length > 0"
              :questions="getSegmentPractice(segment.id)"
            />
          </div>
        </div>
      </div>

      <!-- ── Video View ────────────────────────────────────────── -->
      <div v-else-if="content.type === 'video'" class="video-view">
        <!-- Video Player -->
        <VideoPlayer
          :title="content.title"
          :poster="content.coverImage"
          :playing="isPlaying"
          :current-time="currentTime"
          :duration="content.duration || 0"
          :current-speed="currentSpeed"
          :subtitles="content.bilingualSubtitles"
          :show-bilingual="showBilingual"
          :has-subtitles="!!content.bilingualSubtitles?.length"
          @toggle-play="togglePlay"
          @skip-backward="skipBackward"
          @skip-forward="skipForward"
          @update:speed="(s: number) => currentSpeed = s"
          @toggle-bilingual="showBilingual = !showBilingual"
        />

        <!-- Transcript / Segments -->
        <div class="video-transcript">
          <h3 class="section-label">文字记录</h3>
          <div v-for="segment in content.segments" :key="segment.id" class="segment-block">
            <div v-if="segment.startTime !== undefined" class="timestamp">
              <button class="timestamp-btn" @click="seekToTime(segment.startTime!)">
                {{ formatTime(segment.startTime) }}
              </button>
            </div>

            <div class="segment-header" v-if="segment.title">
              <h4 class="segment-title-sm">{{ segment.title }}</h4>
            </div>

            <div class="segment-content">
              <WordSelector @add-vocabulary="handleAddVocabulary" @word-selected="handleWordSelected">
                <p class="segment-text">{{ segment.content }}</p>
              </WordSelector>
            </div>

            <div v-if="segment.translation" class="segment-translation">
              <p class="translation-text bilingual">{{ segment.translation }}</p>
            </div>

            <SegmentPractice
              v-if="getSegmentPractice(segment.id).length > 0"
              :questions="getSegmentPractice(segment.id)"
            />
          </div>
        </div>
      </div>

      <!-- ── Podcast View ──────────────────────────────────────── -->
      <div v-else-if="content.type === 'podcast'" class="podcast-view">
        <!-- Audio Player -->
        <AudioPlayer
          :playing="isPlaying"
          :current-time="currentTime"
          :duration="content.duration || 0"
          :current-speed="currentSpeed"
          @toggle-play="togglePlay"
          @skip-backward="skipBackward"
          @skip-forward="skipForward"
          @update:speed="(s: number) => currentSpeed = s"
        />

        <!-- Podcast Info -->
        <div class="podcast-info">
          <span v-if="content.speaker" class="speaker-name">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
            {{ content.speaker }}
          </span>
        </div>

        <!-- Dictation Toggle -->
        <div class="transcript-controls">
          <h3 class="section-label">文字记录</h3>
          <button
            :class="['dictation-toggle', { active: dictationMode }]"
            @click="dictationMode = !dictationMode"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
              <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
            {{ dictationMode ? '关闭精听' : '精听模式' }}
          </button>
        </div>

        <!-- Transcript Content -->
        <div class="podcast-transcript">
          <div v-for="segment in content.segments" :key="segment.id" class="segment-block">
            <div class="segment-top-row">
              <div v-if="segment.startTime !== undefined" class="timestamp">
                <button class="timestamp-btn" @click="seekToTime(segment.startTime!)">
                  {{ formatTime(segment.startTime) }}
                </button>
              </div>
              <div v-if="segment.title" class="segment-header-inline">
                <h4 class="segment-title-sm">{{ segment.title }}</h4>
                <PronunciationBtn :text="segment.title" size="sm" />
              </div>
            </div>

            <!-- Dictation Mode -->
            <DictationMode
              v-if="dictationMode"
              :sentence="segment.content"
            />

            <!-- Normal Mode -->
            <template v-else>
              <div class="segment-content">
                <WordSelector @add-vocabulary="handleAddVocabulary" @word-selected="handleWordSelected">
                  <p class="segment-text">{{ segment.content }}</p>
                </WordSelector>
              </div>

              <div v-if="segment.translation" class="segment-translation">
                <p class="translation-text bilingual">{{ segment.translation }}</p>
              </div>
            </template>

            <SegmentPractice
              v-if="getSegmentPractice(segment.id).length > 0"
              :questions="getSegmentPractice(segment.id)"
            />
          </div>
        </div>
      </div>

      <!-- AI Practice Generator -->
      <AIQuestionGenerator
        v-if="content"
        :content="content"
        @questions-generated="(q: any) => aiQuestions = q"
      />

      <!-- ── Overall Practice ──────────────────────────────────── -->
      <section v-if="allPracticeQuestions.length > 0" class="overall-practice">
        <h3 class="section-label">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          综合练习
        </h3>
        <SegmentPractice :questions="allPracticeQuestions" />
      </section>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  Skeleton,
  EmptyState,
  AudioPlayer,
  VideoPlayer,
  ReadingTimer,
  TranslationToggle,
  PronunciationBtn,
  SegmentPractice,
  WordSelector,
  DictationMode,
  AIQuestionGenerator
} from '../components'
import { useContentStore } from '../stores/content'
import { useToast } from '../composables/useToast'
import { useKeyboard } from '../composables/useKeyboard'
import type { ContentItem, PracticeQuestion, ContentType } from '../types'

const route = useRoute()
const router = useRouter()
const toast = useToast()
const contentStore = useContentStore()

// ── State ──────────────────────────────────────────────────────────
const content = ref<ContentItem | null>(null)

// Translation
const translationMode = ref<'original' | 'bilingual' | 'translated'>('original')

// Player state
const isPlaying = ref(false)
const currentTime = ref(0)
const currentSpeed = ref(1)
const showBilingual = ref(false)
const dictationMode = ref(false)

// AI Questions
const aiQuestions = ref([])

// ── Keyboard Shortcuts ─────────────────────────────────────────────
useKeyboard({
  Space: () => togglePlay(),
  ArrowLeft: () => skipBackward(),
  ArrowRight: () => skipForward(),
  Escape: () => {},
  Enter: () => {}
})

// ── Fetch Content ──────────────────────────────────────────────────
async function fetchContent() {
  const id = route.params.id as string
  if (!id) {
    contentStore.loading = false
    return
  }

  await contentStore.fetchById(id)
  content.value = contentStore.currentContent
}

onMounted(fetchContent)

// ── Computed ───────────────────────────────────────────────────────
const allPracticeQuestions = computed<PracticeQuestion[]>(() => {
  if (!content.value?.segmentPractice) return []
  return content.value.segmentPractice.flatMap(group => group.questions)
})

// ── Helper Functions ───────────────────────────────────────────────
function goBack() {
  router.push('/content')
}

function getTypeLabel(type: ContentType): string {
  const labels: Record<ContentType, string> = {
    article: '文章',
    video: '视频',
    podcast: '播客'
  }
  return labels[type]
}

function getSegmentPractice(segmentId: string): PracticeQuestion[] {
  if (!content.value?.segmentPractice) return []
  const group = content.value.segmentPractice.find(g => g.segmentId === segmentId)
  return group?.questions || []
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// ── Player Controls ────────────────────────────────────────────────
function togglePlay() {
  isPlaying.value = !isPlaying.value
}

function skipBackward() {
  currentTime.value = Math.max(0, currentTime.value - 10)
}

function skipForward() {
  const maxDuration = content.value?.duration || 0
  currentTime.value = Math.min(maxDuration, currentTime.value + 10)
}

function seekToTime(time: number) {
  currentTime.value = time
  isPlaying.value = true
}

// ── Word Interaction ───────────────────────────────────────────────
function handleAddVocabulary(word: string) {
  toast.success(`已将 "${word}" 加入生词本`)
}

function handleWordSelected(_word: string) {
  // Optional: track which words users look up
}
</script>

<style scoped>
.content-detail-page {
  padding: var(--space-6);
  max-width: 900px;
  margin: 0 auto;
}

/* ── Loading ─────────────────────────────────────────────────── */
.detail-loading {
  padding: var(--space-8) 0;
}

/* ── Top Bar ─────────────────────────────────────────────────── */
.top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  margin-bottom: var(--space-6);
  padding-bottom: var(--space-4);
  border-bottom: 1px solid var(--color-border);
}

.top-bar-left {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-width: 0;
}

.back-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text-muted);
  cursor: pointer;
  transition: all 0.16s ease;
  flex-shrink: 0;
}

.back-btn:hover {
  background: var(--color-surface-muted);
  color: var(--color-text);
  border-color: var(--color-border-strong);
}

.detail-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-text);
  margin: 0;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: var(--font-sans);
}

.top-bar-right {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-shrink: 0;
}

.source-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  font-size: 0.6875rem;
  font-weight: 700;
  color: var(--color-text-muted);
  background: var(--color-surface-muted);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.difficulty-tag {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  font-size: 0.6875rem;
  font-weight: 700;
  border-radius: var(--radius-sm);
}

.difficulty-A1 { background: var(--color-success-50); color: var(--color-success-700); }
.difficulty-A2 { background: var(--color-success-50); color: var(--color-success-600); }
.difficulty-B1 { background: #fef3c7; color: #d97706; }
.difficulty-B2 { background: #fef3c7; color: #b45309; }
.difficulty-C1 { background: var(--color-danger-50); color: var(--color-danger-600); }
.difficulty-C2 { background: var(--color-danger-50); color: var(--color-danger-700); }

.type-badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  font-size: 0.6875rem;
  font-weight: 700;
  border-radius: var(--radius-sm);
  color: #ffffff;
}

.badge-article { background: rgba(99, 102, 241, 0.9); }
.badge-video { background: rgba(239, 68, 68, 0.9); }
.badge-podcast { background: rgba(59, 130, 246, 0.9); }

/* ── Article View ────────────────────────────────────────────── */
.article-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  margin-bottom: var(--space-6);
  flex-wrap: wrap;
}

/* ── Segments ────────────────────────────────────────────────── */
.segments-list,
.video-transcript,
.podcast-transcript {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

.segment-block {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.segment-header {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.segment-title {
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--color-text);
  margin: 0;
  font-family: var(--font-sans);
}

.segment-title-sm {
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--color-text);
  margin: 0;
  font-family: var(--font-sans);
}

.segment-content {
  position: relative;
}

.segment-text {
  font-size: 1rem;
  line-height: 1.85;
  color: var(--color-text);
  margin: 0;
  font-family: var(--font-sans);
}

.source-link {
  font-size: 0.8125rem;
  color: var(--color-primary);
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 2px;
}

.source-link:hover {
  text-decoration: underline;
}

/* ── Translation ─────────────────────────────────────────────── */
.segment-translation {
  padding: var(--space-3) var(--space-4);
  background: var(--color-surface-muted);
  border-left: 3px solid var(--color-border);
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
}

.translation-text {
  font-size: 0.9375rem;
  line-height: 1.7;
  margin: 0;
  font-family: var(--font-sans);
}

.translation-text.bilingual {
  color: var(--color-text-muted);
}

.translation-text.translated {
  color: var(--color-text);
}

/* ── Video View ──────────────────────────────────────────────── */
.video-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
}

/* ── Podcast View ────────────────────────────────────────────── */
.podcast-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.podcast-info {
  display: flex;
  align-items: center;
  gap: var(--space-4);
}

.speaker-name {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-text-muted);
}

.speaker-name svg {
  flex-shrink: 0;
}

.transcript-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

.dictation-toggle {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-1) var(--space-3);
  font-size: 0.8125rem;
  font-weight: 600;
  font-family: var(--font-sans);
  color: var(--color-text-muted);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.16s ease;
}

.dictation-toggle:hover {
  background: var(--color-surface-muted);
  color: var(--color-text);
}

.dictation-toggle.active {
  background: var(--color-primary);
  color: var(--color-primary-foreground);
  border-color: var(--color-primary);
}

/* ── Timestamps ──────────────────────────────────────────────── */
.segment-top-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.segment-header-inline {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.timestamp {
  flex-shrink: 0;
}

.timestamp-btn {
  display: inline-flex;
  align-items: center;
  padding: 2px 8px;
  font-size: 0.75rem;
  font-weight: 600;
  font-family: var(--font-mono);
  color: var(--color-primary);
  background: var(--color-surface-muted);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.16s ease;
}

.timestamp-btn:hover {
  background: var(--color-primary);
  color: var(--color-primary-foreground);
  border-color: var(--color-primary);
}

/* ── Section Label ───────────────────────────────────────────── */
.section-label {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-text);
  margin: 0 0 var(--space-3);
  font-family: var(--font-sans);
}

.section-label svg {
  flex-shrink: 0;
}

/* ── Overall Practice ────────────────────────────────────────── */
.overall-practice {
  margin-top: var(--space-8);
  padding-top: var(--space-6);
  border-top: 2px solid var(--color-border);
}

/* ── Responsive ──────────────────────────────────────────────── */
@media (max-width: 768px) {
  .content-detail-page {
    padding: var(--space-4);
  }

  .top-bar {
    flex-direction: column;
    align-items: flex-start;
    gap: var(--space-3);
  }

  .top-bar-left {
    width: 100%;
  }

  .detail-title {
    font-size: 1.125rem;
    white-space: normal;
  }

  .top-bar-right {
    flex-wrap: wrap;
  }

  .article-controls {
    flex-direction: column;
    align-items: flex-start;
  }
}

@media (max-width: 480px) {
  .back-btn {
    width: 32px;
    height: 32px;
  }

  .back-btn svg {
    width: 16px;
    height: 16px;
  }
}
</style>
