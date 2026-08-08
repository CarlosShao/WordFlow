<template>
  <div class="transcript-highlight">
    <p class="transcript-text">
      <template v-for="(token, i) in tokens" :key="i">
        <span
          v-if="token.type === 'word'"
          :class="['transcript-word', { 'is-highlighted': isHighlighted(token.value) }]"
          @click="emit('word-click', token.value, $event)"
        >{{ token.value }}</span>
        <span v-else class="transcript-sep">{{ token.value }}</span>
      </template>
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  text: string
  highlightWords?: string[]
}

const props = withDefaults(defineProps<Props>(), {
  highlightWords: () => []
})

const emit = defineEmits<{
  'word-click': [word: string, event: MouseEvent]
}>()

interface Token {
  type: 'word' | 'sep'
  value: string
}

/**
 * Tokenize the text into words and separators (whitespace + punctuation).
 * Words are contiguous sequences of letters, digits, hyphens, or apostrophes.
 * Everything else is a separator.
 */
const tokens = computed<Token[]>(() => {
  const result: Token[] = []
  // Match words (including hyphenated words and contractions) or separators
  const regex = /[\w'\-]+|[^\w'\-]+/g
  let match: RegExpExecArray | null

  while ((match = regex.exec(props.text)) !== null) {
    const value = match[0]
    // A token is a "word" if it contains at least one letter or digit
    if (/[\w]/.test(value)) {
      result.push({ type: 'word', value })
    } else {
      result.push({ type: 'sep', value })
    }
  }

  return result
})

const highlightSet = computed(() => {
  return new Set(props.highlightWords.map(w => w.toLowerCase()))
})

function isHighlighted(word: string): boolean {
  return highlightSet.value.has(word.toLowerCase())
}
</script>

<style scoped>
.transcript-highlight {
  line-height: 1.8;
}

.transcript-text {
  font-size: 0.9375rem;
  color: var(--color-text);
  margin: 0;
}

.transcript-word {
  cursor: pointer;
  padding: 1px 0;
  border-radius: 2px;
  transition: background-color 0.12s ease, color 0.12s ease;
}

.transcript-word:hover {
  background: var(--color-surface-muted);
}

.transcript-word.is-highlighted {
  color: var(--color-primary);
  border-bottom: 1.5px dotted var(--color-primary);
}

.transcript-word.is-highlighted:hover {
  background: var(--color-surface-subtle);
}

.transcript-sep {
  /* Preserve whitespace layout */
  white-space: pre-wrap;
}
</style>
