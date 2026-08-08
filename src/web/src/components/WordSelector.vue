<template>
  <div class="word-selector" @mouseup="handleSelect">
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
            <span v-if="dictEntry?.phonetic" class="word-popover__phonetic">{{ dictEntry.phonetic }}</span>
          </div>

          <!-- Body: definitions -->
          <div v-if="dictEntry" class="word-popover__body">
            <span v-if="dictEntry.pos" class="word-popover__pos">{{ dictEntry.pos }}</span>
            <p class="word-popover__def-en">{{ dictEntry.en }}</p>
            <p class="word-popover__def-cn">{{ dictEntry.cn }}</p>
          </div>
          <div v-else class="word-popover__body">
            <p class="word-popover__empty">该词未收录</p>
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
  phonetic: string
  pos: string
  en: string
  cn: string
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
/*  Mock Dictionary (~30 common words)                                 */
/* ------------------------------------------------------------------ */

const dictionary: Record<string, DictEntry> = {
  // AI & Technology
  ubiquitous: { phonetic: '/juːˈbɪkwɪtəs/', pos: 'adj.', en: 'Present, appearing, or found everywhere.', cn: '无处不在的' },
  paradigm: { phonetic: '/ˈpærədaɪm/', pos: 'n.', en: 'A typical example or pattern of something.', cn: '范式，典范' },
  algorithms: { phonetic: '/ˈælɡərɪðəm/', pos: 'n.', en: 'A process or set of rules to be followed in calculations.', cn: '算法' },
  algorithm: { phonetic: '/ˈælɡərɪðəm/', pos: 'n.', en: 'A process or set of rules to be followed in calculations.', cn: '算法' },
  autonomous: { phonetic: '/ɔːˈtɒnəməs/', pos: 'adj.', en: 'Having the freedom to govern itself or control its own affairs.', cn: '自主的，自治的' },
  artificial: { phonetic: '/ˌɑːrtɪˈfɪʃl/', pos: 'adj.', en: 'Made or produced by human beings rather than occurring naturally.', cn: '人工的，人造的' },
  intelligence: { phonetic: '/ɪnˈtelɪdʒəns/', pos: 'n.', en: 'The ability to acquire and apply knowledge and skills.', cn: '智能，智力' },
  neural: { phonetic: '/ˈnjʊərəl/', pos: 'adj.', en: 'Relating to a nerve or the nervous system.', cn: '神经的' },
  quantum: { phonetic: '/ˈkwɒntəm/', pos: 'n./adj.', en: 'The minimum amount of any physical entity in an interaction.', cn: '量子' },
  blockchain: { phonetic: '/ˈblɒktʃeɪn/', pos: 'n.', en: 'A digital ledger of transactions duplicated and distributed across a network.', cn: '区块链' },

  // Science
  hypothesis: { phonetic: '/haɪˈpɒθəsɪs/', pos: 'n.', en: 'A proposed explanation for a phenomenon, made as a starting point for investigation.', cn: '假说，假设' },
  empirical: { phonetic: '/ɪmˈpɪrɪkl/', pos: 'adj.', en: 'Based on observation or experience rather than theory.', cn: '经验的，实证的' },
  synthesis: { phonetic: '/ˈsɪnθəsɪs/', pos: 'n.', en: 'The combination of ideas to form a theory or system.', cn: '综合，合成' },
  catalyst: { phonetic: '/ˈkætəlɪst/', pos: 'n.', en: 'A substance that increases the rate of a chemical reaction.', cn: '催化剂' },
  entropy: { phonetic: '/ˈentrəpi/', pos: 'n.', en: 'A measure of disorder or randomness in a system.', cn: '熵' },

  // Academic & Abstract
  resilience: { phonetic: '/rɪˈzɪliəns/', pos: 'n.', en: 'The capacity to recover quickly from difficulties.', cn: '韧性，恢复力' },
  ambiguous: { phonetic: '/æmˈbɪɡjuəs/', pos: 'adj.', en: 'Open to more than one interpretation; not clear.', cn: '模糊的，含混的' },
  pragmatic: { phonetic: '/præɡˈmætɪk/', pos: 'adj.', en: 'Dealing with things sensibly and realistically.', cn: '务实的' },
  eloquent: { phonetic: '/ˈeləkwənt/', pos: 'adj.', en: 'Fluent or persuasive in speaking or writing.', cn: '雄辩的，有口才的' },
  meticulous: { phonetic: '/məˈtɪkjələs/', pos: 'adj.', en: 'Showing great attention to detail; very careful and precise.', cn: '一丝不苟的' },

  // Daily & General
  collaborate: { phonetic: '/kəˈlæbəreɪt/', pos: 'v.', en: 'To work jointly on an activity or project.', cn: '合作，协作' },
  sustainable: { phonetic: '/səˈsteɪnəbl/', pos: 'adj.', en: 'Able to be maintained at a certain rate or level.', cn: '可持续的' },
  innovation: { phonetic: '/ˌɪnəˈveɪʃn/', pos: 'n.', en: 'The introduction of new ideas, methods, or products.', cn: '创新' },
  perspective: { phonetic: '/pəˈspektɪv/', pos: 'n.', en: 'A particular attitude toward or way of regarding something.', cn: '观点，视角' },
  inevitable: { phonetic: '/ɪnˈevɪtəbl/', pos: 'adj.', en: 'Certain to happen; unavoidable.', cn: '不可避免的' },
  prevalent: { phonetic: '/ˈprevələnt/', pos: 'adj.', en: 'Widespread in a particular area at a particular time.', cn: '流行的，普遍的' },
  versatile: { phonetic: '/ˈvɜːrsətl/', pos: 'adj.', en: 'Able to adapt to many different functions or activities.', cn: '多才多艺的，多功能的' },
  articulate: { phonetic: '/ɑːrˈtɪkjulət/', pos: 'adj./v.', en: 'Having or showing the ability to speak fluently and coherently.', cn: '善于表达的' },
  scrutinize: { phonetic: '/ˈskruːtənaɪz/', pos: 'v.', en: 'To examine or inspect closely and thoroughly.', cn: '仔细审查' },
  relinquish: { phonetic: '/rɪˈlɪŋkwɪʃ/', pos: 'v.', en: 'To voluntarily give up something.', cn: '放弃，放手' },
}

/* ------------------------------------------------------------------ */
/*  Reactive State                                                     */
/* ------------------------------------------------------------------ */

const popoverRef = ref<HTMLElement | null>(null)
const showPopover = ref(false)
const currentWord = ref('')
const popoverLeft = ref(0)
const popoverTop = ref(0)
const placementAbove = ref(true)

/* ------------------------------------------------------------------ */
/*  Computed                                                           */
/* ------------------------------------------------------------------ */

const dictEntry = computed<DictEntry | null>(() => {
  const word = currentWord.value.toLowerCase().replace(/[^a-z\s'-]/g, '').trim()
  return dictionary[word] || null
})

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
  const selection = window.getSelection()
  if (!selection) return

  const text = selection.toString().trim()
  if (!text) return

  // Only accept single words or short phrases (max 3 words)
  const words = text.split(/\s+/).filter(w => w.length > 0)
  if (words.length === 0 || words.length > 3) return

  // Get the bounding rect of the selection
  const range = selection.getRangeAt(0)
  const rect = range.getBoundingClientRect()

  if (rect.width === 0 && rect.height === 0) return

  currentWord.value = text

  // Compute position: above the selection by default
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

.word-popover__def-en {
  font-size: 0.875rem;
  color: var(--color-text);
  line-height: 1.55;
  margin: var(--space-1) 0;
}

.word-popover__def-cn {
  font-size: 0.8125rem;
  color: var(--color-text-muted);
  line-height: 1.5;
  margin: 0;
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
