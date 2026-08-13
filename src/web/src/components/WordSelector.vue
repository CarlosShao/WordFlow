<template>
  <div class="word-selector" ref="rootRef" @mouseup="handleSelect">
    <slot />
    <Teleport to="body">
      <Transition name="popover">
        <div
          v-if="showPopover"
          ref="popoverRef"
          class="word-popover"
          :style="popoverStyle"
          @mousedown.stop
        >
          <!-- Arrow caret -->
          <div class="word-popover__arrow" :style="arrowStyle" />

          <!-- Header: word + pronunciation -->
          <div class="word-popover__header">
            <div class="word-popover__title-row">
              <span class="word-popover__word">{{ currentWord }}</span>
              <PronunciationBtn v-if="dictEntry" :text="currentWord" size="sm" />
            </div>
            <span v-if="dictEntry?.phonetic?.uk || dictEntry?.phonetic?.us" class="word-popover__phonetic">
              {{ dictEntry?.phonetic?.uk ? `英 [${dictEntry.phonetic.uk}]` : '' }}{{ dictEntry?.phonetic?.uk && dictEntry?.phonetic?.us ? ' ' : '' }}{{ dictEntry?.phonetic?.us ? `美 [${dictEntry.phonetic.us}]` : '' }}
            </span>
          </div>

          <!-- Body: definitions -->
          <div v-if="dictLoading" class="word-popover__body">
            <p class="word-popover__loading">查询中…</p>
          </div>
          <div v-else-if="dictEntry" class="word-popover__body">
            <!-- 中文释义 -->
            <div v-if="dictEntry.translations.length" class="word-popover__translations">
              <div v-for="(t, i) in dictEntry.translations" :key="i" class="word-popover__trow">
                <span v-if="t.pos" class="word-popover__pos">{{ t.pos }}</span>
                <span class="word-popover__cn">{{ t.cn }}</span>
              </div>
            </div>
            <!-- 英文释义 -->
            <div v-if="dictEntry.definitions.length" class="word-popover__defs">
              <div v-for="(d, i) in dictEntry.definitions.slice(0, 2)" :key="'d' + i" class="word-popover__def">
                <span v-if="d.pos" class="word-popover__pos">{{ d.pos }}</span>
                <span class="word-popover__def-en">{{ d.en }}</span>
              </div>
            </div>
            <!-- 双语例句 -->
            <div v-if="dictEntry.examples.length" class="word-popover__examples">
              <div v-for="(e, i) in dictEntry.examples.slice(0, 2)" :key="'e' + i" class="word-popover__example">
                <p class="word-popover__example-en">{{ e.en }}</p>
                <p v-if="e.cn" class="word-popover__example-cn">{{ e.cn }}</p>
              </div>
            </div>
            <!-- 同义词 -->
            <div v-if="dictEntry.synonyms.length" class="word-popover__synonyms">
              <span class="word-popover__syn-label">同义词</span>
              <span v-for="(s, i) in dictEntry.synonyms.slice(0, 5)" :key="'s' + i" class="word-popover__syn-tag">{{ s }}</span>
            </div>
          </div>
          <div v-else class="word-popover__body">
            <p class="word-popover__empty">{{ dictError ? '查询失败' : '该词未收录' }}</p>
            <p class="word-popover__empty-hint">可尝试在词典中手动查询 "{{ currentWord }}"</p>
          </div>

          <!-- Actions -->
          <div class="word-popover__actions">
            <button
              v-if="addToVocabEnabled"
              class="word-popover__btn word-popover__btn--primary"
              @click="handleAddVocab"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              加入生词本
            </button>
            <button class="word-popover__btn word-popover__btn--secondary" @click="closePopover">
              关闭
            </button>
          </div>

          <!-- Close button (top-right) -->
          <button class="word-popover__close" @click="closePopover" aria-label="关闭">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import PronunciationBtn from './PronunciationBtn.vue'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface DictEntry {
  word: string
  phonetic: { us?: string; uk?: string; usAudio?: string; ukAudio?: string }
  translations: { pos: string; cn: string }[]
  definitions: { pos: string; en: string; synonyms?: string[] }[]
  examples: { en: string; cn: string }[]
  synonyms: string[]
  antonyms: string[]
  exams: string[]
  source: string
}

/* ------------------------------------------------------------------ */
/*  Props & Emits                                                      */
/* ------------------------------------------------------------------ */

interface Props {
  addToVocabEnabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  addToVocabEnabled: true,
})

const emit = defineEmits<{
  'add-vocabulary': [word: string]
  'word-selected': [word: string]
}>()

/* ------------------------------------------------------------------ */
/*  Reactive State                                                     */
/* ------------------------------------------------------------------ */

const popoverRef = ref<HTMLElement | null>(null)
const rootRef = ref<HTMLElement | null>(null)
const showPopover = ref(false)
const currentWord = ref('')
const popoverLeft = ref(0)
const popoverTop = ref(0)
const placementAbove = ref(true)
const dictEntry = ref<DictEntry | null>(null)
const dictLoading = ref(false)
const dictError = ref(false)

/* ------------------------------------------------------------------ */
/*  Dictionary Lookup                                                  */
/* ------------------------------------------------------------------ */

async function loadDict(word: string) {
  dictLoading.value = true
  dictError.value = false
  dictEntry.value = null
  try {
    const { dictionaryApi } = await import('../api/dictionary')
    dictEntry.value = await dictionaryApi.lookup(word)
  } catch {
    dictError.value = true
  } finally {
    dictLoading.value = false
  }
}

/* ------------------------------------------------------------------ */
/*  Computed                                                           */
/* ------------------------------------------------------------------ */

const popoverStyle = computed(() => ({
  left: `${popoverLeft.value}px`,
  top: `${popoverTop.value}px`,
}))

const arrowStyle = computed(() => {
  if (placementAbove.value) {
    // Arrow at the bottom of popover pointing down
    return {
      bottom: '-6px',
      left: '50%',
      transform: 'translateX(-50%) rotate(45deg)',
    }
  }
  // Arrow at the top of popover pointing up
  return {
    top: '-6px',
    left: '50%',
    transform: 'translateX(-50%) rotate(45deg)',
  }
})

/* ------------------------------------------------------------------ */
/*  Selection Handling                                                 */
/* ------------------------------------------------------------------ */

function handleSelect(_event: MouseEvent) {
  // Defer to the next tick so a double-click / drag-select has fully
  // formed the Selection before we read it. On the first mouseup of a
  // double-click the selection is often still empty.
  window.setTimeout(() => {
    doSelect()
  }, 10)
}

function doSelect() {
  const selection = window.getSelection()
  if (!selection || !selection.rangeCount) return

  // Selection must actually intersect the wrapper; otherwise mouseup on a
  // stray click would try to look up unrelated text and the getRangeAt(0)
  // call below would throw.
  const wrapper = rootRef.value
  if (!wrapper) return
  const range = selection.getRangeAt(0)
  if (!range.intersectsNode(wrapper)) return

  const text = selection.toString().trim()
  if (!text) return

  // Accept any selected word/phrase — including a full sentence. Dictionary
  // lookup of a long phrase may return nothing, but we still show the
  // popover with feedback rather than silently doing nothing.
  const words = text.split(/\s+/).filter(w => w.length > 0)
  if (words.length === 0) return

  // Get the bounding rect of the selection (wrap defensively — collapsed
  // ranges throw DOMException in some WebViews).
  let rect: DOMRect
  try {
    rect = range.getBoundingClientRect()
  } catch {
    return
  }

  if (rect.width === 0 && rect.height === 0) return

  // Long selections (sentences) aren't dictionary words — look up only the
  // first word as a fallback so the popover always shows something useful.
  currentWord.value = words.length > 3 ? words.slice(0, 3).join(' ') : text

  // Fetch word definition from backend dictionary API
  loadDict(text)
  const popoverHeight = 220 // estimated
  const popoverWidth = 320
  const gap = 10

  const scrollY = window.scrollY
  const scrollX = window.scrollX
  const viewportWidth = window.innerWidth

  // Center horizontally relative to the selection
  let left = rect.left + scrollX + rect.width / 2 - popoverWidth / 2
  // Clamp to viewport
  left = Math.max(scrollX + 8, Math.min(left, scrollX + viewportWidth - popoverWidth - 8))

  let top: number
  let above = true

  // Try above first
  if (rect.top >= popoverHeight + gap) {
    top = rect.top + scrollY - popoverHeight - gap
  } else {
    // Fall back to below
    top = rect.bottom + scrollY + gap
    above = false
  }

  popoverLeft.value = left
  popoverTop.value = top
  placementAbove.value = above
  showPopover.value = true

  emit('word-selected', text)

  // Clear the browser selection so it doesn't interfere
  selection.removeAllRanges()
}

/* ------------------------------------------------------------------ */
/*  Actions                                                            */
/* ------------------------------------------------------------------ */

function handleAddVocab() {
  emit('add-vocabulary', currentWord.value)
  closePopover()
}

function closePopover() {
  showPopover.value = false
}

/* ------------------------------------------------------------------ */
/*  Click-outside & Escape                                             */
/* ------------------------------------------------------------------ */

function onDocumentClick(e: MouseEvent) {
  if (!showPopover.value) return
  const target = e.target as Node
  if (popoverRef.value && popoverRef.value.contains(target)) return
  // Also check if the click was inside the wrapper (allow re-select)
  closePopover()
}

function onDocumentKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && showPopover.value) {
    closePopover()
  }
}

function onScroll() {
  if (showPopover.value) {
    closePopover()
  }
}

/* ------------------------------------------------------------------ */
/*  Lifecycle                                                          */
/* ------------------------------------------------------------------ */

onMounted(() => {
  document.addEventListener('click', onDocumentClick, true)
  document.addEventListener('keydown', onDocumentKeydown)
  window.addEventListener('scroll', onScroll, true)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick, true)
  document.removeEventListener('keydown', onDocumentKeydown)
  window.removeEventListener('scroll', onScroll, true)
})
</script>

<style scoped>
.word-selector {
  display: contents;
}

/* ── Popover Container ──────────────────────────────────────────── */

.word-popover {
  position: absolute;
  z-index: 9999;
  width: 320px;
  max-width: calc(100vw - 16px);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  font-family: var(--font-sans);
  user-select: none;
}

/* ── Arrow / Caret ──────────────────────────────────────────────── */

.word-popover__arrow {
  position: absolute;
  width: 10px;
  height: 10px;
  background: var(--color-surface);
  border-right: 1px solid var(--color-border);
  border-bottom: 1px solid var(--color-border);
  pointer-events: none;
}

/* ── Close Button (top-right) ───────────────────────────────────── */

.word-popover__close {
  position: absolute;
  top: var(--space-2);
  right: var(--space-2);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-text-muted);
  cursor: pointer;
  transition: background-color 0.16s ease, color 0.16s ease;
}

.word-popover__close:hover {
  background: var(--color-surface-muted);
  color: var(--color-text);
}

/* ── Header ─────────────────────────────────────────────────────── */

.word-popover__header {
  padding: var(--space-3) var(--space-3) var(--space-2);
  padding-right: var(--space-8);
  border-bottom: 1px solid var(--color-border);
}

.word-popover__title-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-1);
}

.word-popover__word {
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--color-text);
  line-height: 1.3;
}

.word-popover__phonetic {
  font-family: var(--font-mono);
  font-size: 0.8125rem;
  color: var(--color-text-muted);
  line-height: 1;
}

/* ── Body ───────────────────────────────────────────────────────── */

.word-popover__body {
  padding: var(--space-2) var(--space-3) var(--space-3);
}

.word-popover__pos {
  display: inline-block;
  padding: 1px 6px;
  margin-bottom: var(--space-1);
  font-size: 0.6875rem;
  font-weight: 600;
  color: var(--color-text-muted);
  background: var(--color-surface-muted);
  border-radius: var(--radius-sm);
}

.word-popover__def-cn {
  font-size: 0.8125rem;
  color: var(--color-text-muted);
  line-height: 1.5;
  margin: 0;
}

/* ── Rich dictionary content ───────────────────────────────────── */

.word-popover__loading {
  font-size: 0.8125rem;
  color: var(--color-text-muted);
  margin: 0;
}

.word-popover__translations,
.word-popover__defs,
.word-popover__examples {
  margin-bottom: var(--space-2);
}

.word-popover__trow {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
  margin-bottom: var(--space-1);
}

.word-popover__cn {
  font-size: 0.875rem;
  color: var(--color-text);
  line-height: 1.5;
}

.word-popover__def {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
  margin-bottom: var(--space-1);
}

.word-popover__def-en {
  font-size: 0.8125rem;
  color: var(--color-text-muted);
  line-height: 1.5;
  margin: 0;
}

.word-popover__example {
  padding: var(--space-1) var(--space-2);
  margin-bottom: var(--space-1);
  background: var(--color-surface-muted);
  border-radius: var(--radius-sm);
}

.word-popover__example-en {
  font-size: 0.8125rem;
  color: var(--color-text);
  line-height: 1.5;
  margin: 0;
}

.word-popover__example-cn {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  line-height: 1.45;
  margin: var(--space-1) 0 0;
}

.word-popover__synonyms {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-1);
  padding-top: var(--space-1);
  border-top: 1px dashed var(--color-border);
}

.word-popover__syn-label {
  font-size: 0.6875rem;
  color: var(--color-text-muted);
  margin-right: var(--space-1);
}

.word-popover__syn-tag {
  font-size: 0.75rem;
  color: var(--color-primary);
  background: var(--color-surface-muted);
  padding: 1px 6px;
  border-radius: var(--radius-sm);
}

.word-popover__empty {
  font-size: 0.875rem;
  color: var(--color-text-muted);
  margin: 0 0 var(--space-1);
}

.word-popover__empty-hint {
  font-size: 0.8125rem;
  color: var(--color-text-muted);
  margin: 0;
  opacity: 0.75;
}

/* ── Actions ────────────────────────────────────────────────────── */

.word-popover__actions {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  border-top: 1px solid var(--color-border);
  background: var(--color-surface-muted);
  border-radius: 0 0 var(--radius-md) var(--radius-md);
}

.word-popover__btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: var(--space-1) var(--space-3);
  font-size: 0.8125rem;
  font-weight: 500;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.16s ease;
  line-height: 1.4;
}

.word-popover__btn--primary {
  background: var(--color-primary);
  color: var(--color-primary-foreground);
  border-color: var(--color-primary);
}

.word-popover__btn--primary:hover {
  opacity: 0.88;
}

.word-popover__btn--secondary {
  background: var(--color-surface);
  color: var(--color-text-muted);
  border-color: var(--color-border);
}

.word-popover__btn--secondary:hover {
  color: var(--color-text);
  border-color: var(--color-border-strong);
}

/* ── Transition ─────────────────────────────────────────────────── */

.popover-enter-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.popover-leave-active {
  transition: opacity 0.12s ease, transform 0.12s ease;
}

.popover-enter-from {
  opacity: 0;
  transform: translateY(6px) scale(0.96);
}

.popover-leave-to {
  opacity: 0;
  transform: translateY(4px) scale(0.98);
}
</style>
