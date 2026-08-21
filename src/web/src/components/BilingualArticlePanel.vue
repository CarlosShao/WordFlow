<template>
  <div class="bilingual-text">
    <template v-if="paragraphs.length > 0">
      <div
        v-for="(para, idx) in paragraphs"
        :key="idx"
        :class="['bilingual-block', { 'block-active': activeParaIdx === idx }]"
      >
        <WordSelector class="bi-en" @add-vocabulary="(w: string) => emit('add-vocabulary', w)">
          <span
            v-for="(sent, si) in para.sentences"
            :key="si"
            :class="['sentence', { 'sentence-active': activeParaIdx === idx && activeSentenceIdx === si }]"
            @mouseenter="emit('sentence-enter', idx, si)"
            @mouseleave="emit('sentence-leave')"
          >{{ sent.en }}</span>
        </WordSelector>
          <div v-if="para.zh || hasAnyZh" :class="['bi-zh', { 'no-translate': !para.zh }]">
            <template v-if="para.zh">
              <!-- Sentences arrive as pre-aligned en/zh pairs (see
                   buildBilingualParagraphs in utils/text.ts), so highlighting
                   the Nth Chinese span needs no count comparison. -->
              <span
                v-for="(sent, zi) in para.sentences"
                :key="zi"
                :class="['zh-sentence', { 'zh-sentence-active': activeParaIdx === idx && activeSentenceIdx === zi }]"
              >{{ sent.zh }}</span>
            </template>
            <span v-else class="zh-sentence">（暂无对应翻译）</span>
          </div>
      </div>
    </template>
    <div v-else class="translation-hint">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 16v-4M12 8h.01" />
      </svg>
      <span>双语对照需要完整的英文原文和中文翻译，当前数据不足。</span>
    </div>
  </div>
</template>

<!--
  Shared bilingual reading panel: paragraphs of aligned en/zh sentence pairs
  with sentence-level hover highlighting. Used by the video detail page in
  three places (video panel, podcast panel, standalone article section), so
  the markup lives here instead of being triplicated.
-->
<script setup lang="ts">
import { computed } from 'vue'
import WordSelector from './WordSelector.vue'
import type { BilingualParagraph } from '../utils/text'

const props = defineProps<{
  paragraphs: BilingualParagraph[]
  activeParaIdx: number
  activeSentenceIdx: number
}>()

// When SOME paragraphs are translated but others aren't, the untranslated
// ones show a 暂无翻译 placeholder. When the whole article has no Chinese
// (e.g. TOEFL exam passages imported English-only), repeating that
// placeholder under every paragraph is just noise — render pure English.
const hasAnyZh = computed(() => props.paragraphs.some((p) => p.zh))

const emit = defineEmits<{
  'sentence-enter': [paraIdx: number, sentIdx: number]
  'sentence-leave': []
  'add-vocabulary': [word: string]
}>()
</script>

<style scoped>
/* Styles moved verbatim from ContentDetailPage.vue when the markup was
   extracted into this shared component. */
.bilingual-text {
  padding: 0;
}

/* Paragraph-level bilingual reading blocks: an English paragraph with
   several sentences, followed by its translated paragraph below it. */
.bilingual-block {
  padding: var(--space-5, 20px) var(--space-4, 16px);
  border-bottom: 1px solid var(--color-border, #e5e7eb);
  border-radius: var(--radius-md, 8px);
  transition: background-color 0.2s ease;
}

.bilingual-block:last-child {
  border-bottom: none;
}

.bilingual-block .bi-en {
  display: block;
  font-size: 1rem;
  line-height: 1.9;
  color: var(--color-text, inherit);
  margin-bottom: var(--space-3, 12px);
  word-break: break-word;
}

/* Sentence-level hover: each sentence is a span inside the English
   paragraph. Hovering one lifts it slightly and warms its color. The
   active state is driven by a JS-set class (`.sentence-active`) instead of
   pure CSS so that the matching Chinese sentence can light up at the same
   time. */
.sentence {
  display: inline-block; /* inline ignores transform — make it liftable */
  border-radius: 4px;
  padding: 1px 2px;
  margin-right: 2px;     /* a thin gap between sentences, less than a full word-space */
  transition: transform 0.18s ease, background-color 0.18s ease, color 0.18s ease, box-shadow 0.18s ease;
  cursor: default;
  line-height: 1.9;
}

.sentence.sentence-active,
.sentence:hover {
  transform: translateY(-2px);
  color: var(--color-primary, #4f46e5);
  background: rgba(79, 70, 229, 0.08); /* primary-indigo translucent wash */
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

/* Highlight only the Chinese sentence that corresponds to the hovered
   English sentence — NOT the whole Chinese paragraph. */
.bilingual-block .bi-zh .zh-sentence {
  display: inline;
  border-radius: 4px;
  padding: 1px 2px;
  transition: background-color 0.18s ease, color 0.18s ease;
}

.bilingual-block .bi-zh .zh-sentence.zh-sentence-active {
  background: rgba(79, 70, 229, 0.1);
  color: var(--color-text, inherit);
}

/* Subtle left-border emphasis on the paragraph owning the active sentence. */
.bilingual-block:has(.bi-zh .zh-sentence.zh-sentence-active) {
  border-left: 2px solid var(--color-primary, #4f46e5);
  margin-left: -2px;
}

.bi-zh {
  font-size: 0.9375rem;
  line-height: 1.8;
  color: var(--color-text-muted, #6b7280);
  padding: var(--space-2, 8px) var(--space-3, 12px);
  text-indent: 2em;          /* Chinese paragraph first-line indent */
  border-left: 2px solid var(--color-border, #e5e7eb);
  transition: background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease;
}

.translation-hint {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3, 12px);
  padding: var(--space-4, 16px) var(--space-5, 20px);
  background: var(--color-surface-muted, #f3f4f6);
  border-radius: var(--radius-md, 8px);
  color: var(--color-text-muted, #6b7280);
  font-size: 0.9375rem;
  line-height: 1.6;
}

.translation-hint svg {
  flex-shrink: 0;
  color: var(--color-text-muted, #6b7280);
}
</style>
