<!--
  TranscriptPanel — bilingual subtitle / article panel shared by the video
  and audio sections of ContentDetailPage. Replaces ~350 lines of duplicated
  markup previously inlined in each media section.

  Public API:
  - Props: all transcript state, settings, active index
  - Emits: update:activeContentTab, update:showTranscriptSettings,
           seek, sentence-enter, sentence-leave, addVocabulary, selectText
  - Auto-scrolls the active segment via an internal watcher so the
    parent doesn't need to manage scroll position through a ref.
-->
<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import BilingualArticlePanel from '../components/BilingualArticlePanel.vue'
import { formatTime } from '../utils/format'

// ── Props ──────────────────────────────────────────────────────

interface Props {
  activeContentTab: 'transcript' | 'article'
  hasArticleContent: boolean
  transcriptSegments: Array<{ start?: number; end?: number; en: string; zh: string }>
  segmentsLoading: boolean
  parentLoading: boolean
  showTranscriptSettings: boolean
  transcriptSettings: {
    fontSize: number
    bgOpacity: number
    showTimestamps: boolean
    autoScroll: boolean
  }
  activeSegmentIndex: number
  canSeek: boolean
  bilingualParagraphs: any[]
}

const props = defineProps<Props>()

// ── Emits ──────────────────────────────────────────────────────

const emit = defineEmits<{
  'update:activeContentTab': [tab: 'transcript' | 'article']
  'update:showTranscriptSettings': [v: boolean]
  seek: [seg: { start?: number }, idx: number]
  'sentence-enter': [paraIdx: number, sentIdx: number]
  'sentence-leave': []
  addVocabulary: [word: string]
  'select-text': []
}>()

// ── Internal auto-scroll ───────────────────────────────────────

const bodyRef = ref<HTMLElement | null>(null)
let lastAutoScrolledIndex = -1

watch(
  () => props.activeSegmentIndex,
  (idx) => {
    if (!props.transcriptSettings.autoScroll || idx < 0 || !bodyRef.value) return
    const moved = idx !== lastAutoScrolledIndex
    if (!moved) return
    lastAutoScrolledIndex = idx

    const container = bodyRef.value
    if (!container || !container.isConnected) return
    const blocks = container.children
    const block = blocks[idx] as HTMLElement | undefined
    if (!block || !block.isConnected) return

    const containerRect = container.getBoundingClientRect()
    const blockRect = block.getBoundingClientRect()
    const blockTop = blockRect.top - containerRect.top + container.scrollTop
    const blockBottom = blockTop + blockRect.height
    const viewTop = container.scrollTop
    const viewBottom = viewTop + container.clientHeight
    const GAP = 12

    if (blockBottom > viewBottom) {
      container.scrollTo({ top: Math.max(0, blockTop - GAP), behavior: 'smooth' })
    } else if (blockTop < viewTop) {
      container.scrollTo({ top: Math.max(0, blockTop - GAP), behavior: 'smooth' })
    }
  },
)

// ── Computed ───────────────────────────────────────────────────

const totalLabel = computed(() => props.transcriptSegments.length)
</script>

<template>
  <div class="transcript-panel">
    <!-- Tab bar -->
    <div class="transcript-header">
      <div class="tab-bar">
        <button
          :class="['tab-btn', { active: activeContentTab === 'transcript' || !hasArticleContent }]"
          @click="emit('update:activeContentTab', 'transcript')"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <path d="M6 8h4M6 12h8M6 16h12" />
          </svg>
          字幕
          <span v-if="activeSegmentIndex >= 0" class="tab-progress">
            {{ activeSegmentIndex + 1 }} / {{ totalLabel }}
          </span>
        </button>
        <button
          v-if="hasArticleContent"
          :class="['tab-btn', { active: activeContentTab === 'article' }]"
          @click="emit('update:activeContentTab', 'article')"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 6h16M4 12h16M4 18h12" />
          </svg>
          双语全文
        </button>
      </div>
      <div class="transcript-header-controls">
        <button
          class="transcript-settings-btn"
          @click="emit('update:showTranscriptSettings', !showTranscriptSettings)"
          title="字幕设置"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- Settings sub-panel -->
    <div v-if="showTranscriptSettings" class="transcript-settings-panel">
      <div class="setting-row">
        <label>字体大小</label>
        <input type="range" :value="transcriptSettings.fontSize" @input="transcriptSettings.fontSize = Number(($event.target as HTMLInputElement).value)" min="12" max="24" step="1" />
        <span class="setting-value">{{ transcriptSettings.fontSize }}px</span>
      </div>
      <div class="setting-row">
        <label>背景透明度</label>
        <input type="range" :value="transcriptSettings.bgOpacity" @input="transcriptSettings.bgOpacity = Number(($event.target as HTMLInputElement).value)" min="0" max="0.3" step="0.02" />
        <span class="setting-value">{{ Math.round(transcriptSettings.bgOpacity * 100) }}%</span>
      </div>
      <div class="setting-row">
        <label>显示时间戳</label>
        <input type="checkbox" :checked="transcriptSettings.showTimestamps" @change="transcriptSettings.showTimestamps = ($event.target as HTMLInputElement).checked" />
      </div>
      <div class="setting-row">
        <label>自动滚动</label>
        <input type="checkbox" :checked="transcriptSettings.autoScroll" @change="transcriptSettings.autoScroll = ($event.target as HTMLInputElement).checked" />
      </div>
    </div>

    <!-- Transcript / subtitle body -->
    <div
      ref="bodyRef"
      v-show="activeContentTab === 'transcript' || !hasArticleContent"
      class="transcript-body"
      :style="{ fontSize: transcriptSettings.fontSize + 'px' }"
      @mouseup="emit('select-text')"
    >
      <div v-if="transcriptSegments.length === 0 && !parentLoading" class="transcript-empty">
        <template v-if="segmentsLoading">
          <div class="spinner spinner-sm"></div>
          <span>字幕较多，正在加载字幕数据…</span>
        </template>
        <template v-else>字幕加载中…</template>
      </div>
      <div
        v-for="(seg, idx) in transcriptSegments"
        :key="idx"
        :class="['transcript-block', { active: idx === activeSegmentIndex, clickable: canSeek }]"
        @click="emit('seek', { seg, idx })"
      >
        <div v-if="(seg.start !== undefined || seg.end !== undefined) && transcriptSettings.showTimestamps" class="transcript-block-header">
          <span v-if="seg.start !== undefined" class="transcript-time">{{ formatTime(seg.start) }}</span>
          <span v-if="seg.end !== undefined && seg.start !== undefined" class="transcript-time duration-hint">
            {{ formatTime(seg.end - seg.start) }}
          </span>
        </div>
        <div class="transcript-en">{{ seg.en }}</div>
        <div :class="['transcript-zh', { 'no-translate': !seg.zh }]" :style="{ backgroundColor: `rgba(143, 155, 179, ${transcriptSettings.bgOpacity})` }">
          {{ seg.zh || '（暂无对应翻译）' }}
        </div>
      </div>
    </div>

    <!-- Bilingual full-article body -->
    <div v-show="activeContentTab === 'article' && hasArticleContent" class="article-panel">
      <div class="article-body">
        <BilingualArticlePanel
          :paragraphs="bilingualParagraphs"
          @sentence-enter="$emit('sentence-enter', ...arguments)"
          @sentence-leave="$emit('sentence-leave')"
          @add-vocabulary="$emit('addVocabulary', $event)"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.transcript-panel {
  margin-top: var(--space-4);
}
.transcript-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-3);
}
.transcript-header h3 {
  font-size: var(--font-size-lg);
  font-weight: 600;
}
.tab-bar {
  display: inline-flex;
  gap: var(--space-1);
  background: var(--color-surface-subtle);
  padding: 3px;
  border-radius: var(--radius-md);
}
.tab-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 14px;
  border-radius: var(--radius-sm);
  font-size: var(--font-size-sm);
  font-weight: 500;
  color: var(--color-text-muted);
  transition: all 0.15s ease;
  border: none;
  background: transparent;
  cursor: pointer;
}
.tab-btn:hover:not(.active) {
  color: var(--color-text);
  background: var(--color-surface-muted);
}
.tab-btn.active {
  background: var(--color-surface);
  color: var(--color-text);
  box-shadow: var(--shadow-xs);
  font-weight: 600;
}
.tab-progress {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  font-weight: 400;
}
.transcript-progress {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
}
.transcript-header-controls {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
}
.transcript-settings-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm);
  color: var(--color-text-muted);
  transition: all 0.15s ease;
  border: none;
  background: transparent;
  cursor: pointer;
}
.transcript-settings-btn:hover {
  background: var(--color-surface-muted);
  color: var(--color-text);
}
.transcript-settings-panel {
  background: var(--color-surface-subtle);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  padding: var(--space-4);
  margin-bottom: var(--space-3);
}
.setting-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) 0;
}
.setting-row label {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
  min-width: 70px;
}
.setting-row input[type="range"] {
  flex: 1;
  max-width: 180px;
  accent-color: var(--color-primary);
}
.setting-row input[type="checkbox"] {
  width: 16px;
  height: 16px;
  accent-color: var(--color-primary);
}
.setting-value {
  font-size: var(--font-size-sm);
  color: var(--color-text-muted);
  min-width: 36px;
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.transcript-body {
  max-height: 50vh;
  overflow-y: auto;
  border-radius: var(--radius-md);
  position: relative;
}
.article-panel {
  border-radius: var(--radius-md);
}
.article-panel .article-body {
  border-radius: var(--radius-md);
}
.article-panel .bilingual-text {
  border-radius: var(--radius-md);
}
.transcript-block {
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--color-border);
  transition: background-color 0.12s ease;
  position: relative;
}
.transcript-block:last-child {
  border-bottom: none;
}
.transcript-block.clickable {
  cursor: pointer;
}
.transcript-block.clickable:hover {
  background: var(--color-surface-muted);
}
.transcript-block.active {
  background: var(--color-surface-muted);
  border-left: 3px solid var(--color-primary);
  padding-left: calc(var(--space-4) - 3px);
}
.transcript-block.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: var(--color-primary);
}
.transcript-block.active::after {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: calc(var(--space-4) - 3px);
  background: var(--color-primary);
  opacity: 0.05;
}
.transcript-block.active .transcript-en {
  color: var(--color-text);
  font-weight: 500;
}
.transcript-block.active .transcript-time {
  color: var(--color-primary);
}
.transcript-block-header {
  display: flex;
  gap: var(--space-2);
  margin-bottom: 4px;
}
.transcript-time {
  font-size: 0.75rem;
  color: var(--color-text-300);
  font-family: var(--font-mono);
  font-variant-numeric: tabular-nums;
}
.transcript-time.duration-hint {
  opacity: 0.6;
}
.transcript-en {
  font-size: 0.9375rem;
  line-height: 1.65;
  color: var(--color-text);
  margin-bottom: 4px;
}
.transcript-zh {
  font-size: 0.875rem;
  line-height: 1.55;
  color: var(--color-text-muted);
  padding: 6px 10px;
  border-radius: var(--radius-sm);
  transition: background-color 0.15s ease;
}
.transcript-zh.no-translate {
  color: var(--color-text-300);
  font-style: italic;
}
.transcript-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-8) var(--space-4);
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}
</style>
