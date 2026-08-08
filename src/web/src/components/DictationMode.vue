<template>
  <div class="dictation">
    <!-- Sentence display / mask -->
    <div class="dictation-sentence">
      <template v-if="revealed">
        <span class="sentence-text">{{ sentence }}</span>
      </template>
      <template v-else>
        <span class="sentence-masked">{{ maskedSentence }}</span>
      </template>
      <PronunciationBtn :text="sentence" size="sm" />
    </div>

    <!-- Audio fragment player (optional) -->
    <audio v-if="audioFragment" ref="audioEl" :src="audioFragment" preload="auto" />

    <!-- User input -->
    <textarea
      v-model="userInput"
      class="dictation-input"
      placeholder="输入你听到的内容..."
      rows="3"
      :disabled="showResult"
    />

    <!-- Diff result -->
    <div v-if="showResult && diffResult.length" class="dictation-diff">
      <span
        v-for="(chunk, i) in diffResult"
        :key="i"
        :class="[
          'diff-char',
          {
            'diff-correct': chunk.type === 'correct',
            'diff-wrong': chunk.type === 'wrong',
            'diff-missing': chunk.type === 'missing'
          }
        ]"
      >{{ chunk.char }}</span>
    </div>

    <!-- Actions -->
    <div class="dictation-actions">
      <button class="dict-btn dict-btn--check" :disabled="!userInput.trim()" @click="check">
        检查
      </button>
      <button class="dict-btn dict-btn--reveal" @click="reveal">
        显示答案
      </button>
      <button class="dict-btn dict-btn--retry" @click="retry">
        重试
      </button>
      <button
        v-if="audioFragment"
        class="dict-btn dict-btn--replay"
        @click="replayAudio"
      >
        重播音频
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import PronunciationBtn from './PronunciationBtn.vue'

interface Props {
  sentence: string
  audioFragment?: string
}

const props = defineProps<Props>()

const userInput = ref('')
const revealed = ref(false)
const showResult = ref(false)
const audioEl = ref<HTMLAudioElement | null>(null)

/** Mask the sentence: letters/digits → '_' ; whitespace/punctuation → kept visible. */
const maskedSentence = computed(() => {
  return [...props.sentence]
    .map(ch => {
      if (/[\s,.!?;:'"()\-\u2013\u2014\u2026]/.test(ch)) return ch
      if (/[\u3000-\u303F\uFF00-\uFFEF]/.test(ch)) return ch
      return '_'
    })
    .join('')
})

interface DiffChunk {
  char: string
  type: 'correct' | 'wrong' | 'missing'
}

/**
 * Character-by-character diff against the correct sentence.
 * Iterates over the correct sentence; for each position:
 *   - If user has a matching char → correct
 *   - If user has a different char → wrong (strikethrough)
 *   - If user has no char (shorter) → missing
 * Extra trailing chars in user input are shown as wrong.
 */
const diffResult = computed<DiffChunk[]>(() => {
  if (!showResult.value) return []

  const correct = props.sentence
  const input = userInput.value
  const result: DiffChunk[] = []

  const correctLen = [...correct].length
  const inputChars = [...input]
  const correctChars = [...correct]

  const maxLen = Math.max(correctLen, inputChars.length)

  for (let i = 0; i < maxLen; i++) {
    const cChar = i < correctLen ? correctChars[i] : undefined
    const uChar = i < inputChars.length ? inputChars[i] : undefined

    if (uChar !== undefined && cChar !== undefined) {
      result.push({
        char: cChar,
        type: uChar.toLowerCase() === cChar.toLowerCase() ? 'correct' : 'wrong'
      })
    } else if (uChar !== undefined && cChar === undefined) {
      // Extra char in user input (not in correct sentence)
      result.push({ char: uChar, type: 'wrong' })
    } else if (uChar === undefined && cChar !== undefined) {
      // Missing char in user input
      result.push({ char: cChar, type: 'missing' })
    }
  }

  return result
})

function check() {
  if (!userInput.value.trim()) return
  revealed.value = false
  showResult.value = true
}

function reveal() {
  revealed.value = true
  showResult.value = false
}

function retry() {
  userInput.value = ''
  revealed.value = false
  showResult.value = false
}

function replayAudio() {
  if (audioEl.value) {
    audioEl.value.currentTime = 0
    audioEl.value.play()
  }
}
</script>

<style scoped>
.dictation {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-4);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
}

.dictation-sentence {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  background: var(--color-surface-muted);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-family: var(--font-mono);
  font-size: 0.9375rem;
  line-height: 1.6;
}

.sentence-text {
  color: var(--color-text);
  word-break: break-word;
}

.sentence-masked {
  color: var(--color-text-muted);
  letter-spacing: 0.15em;
  word-break: break-word;
}

.dictation-input {
  width: 100%;
  padding: var(--space-3);
  font-family: var(--font-sans);
  font-size: 0.9375rem;
  line-height: 1.6;
  color: var(--color-text);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  resize: vertical;
  transition: border-color 0.16s ease, box-shadow 0.16s ease;
}

.dictation-input:focus {
  outline: none;
  border-color: var(--color-primary);
  box-shadow: 0 0 0 2px rgba(24, 24, 27, 0.08);
}

.dictation-input:disabled {
  background: var(--color-surface-muted);
  opacity: 0.7;
}

.dictation-input::placeholder {
  color: var(--color-text-muted);
}

/* Diff display */
.dictation-diff {
  padding: var(--space-3);
  background: var(--color-surface-muted);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  font-family: var(--font-mono);
  font-size: 0.9375rem;
  line-height: 2;
  word-break: break-all;
}

.diff-char {
  display: inline;
  padding: 1px 1px;
  border-radius: 2px;
}

.diff-correct {
  background: var(--color-success-50);
  color: var(--color-success-700);
}

.diff-wrong {
  background: var(--color-danger-50);
  color: var(--color-danger-600);
  text-decoration: line-through;
}

.diff-missing {
  background: var(--color-danger-200);
  color: var(--color-danger-700);
}

/* Actions */
.dictation-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.dict-btn {
  padding: var(--space-2) var(--space-4);
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-text);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background-color 0.16s ease, color 0.16s ease, border-color 0.16s ease;
}

.dict-btn:hover:not(:disabled) {
  background: var(--color-surface-muted);
  border-color: var(--color-border-strong);
}

.dict-btn:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

.dict-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.dict-btn--check {
  background: var(--color-primary);
  color: var(--color-primary-foreground);
  border-color: var(--color-primary);
}

.dict-btn--check:hover:not(:disabled) {
  filter: brightness(0.92);
}

.dict-btn--reveal {
  color: var(--color-primary);
}

.dict-btn--retry {
  color: var(--color-text-muted);
}
</style>
