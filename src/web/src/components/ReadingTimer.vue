<template>
  <div class="reading-timer">
    <span class="timer-icon" aria-hidden="true">⏱</span>
    <span class="timer-time">{{ formattedTime }}</span>
    <span class="timer-sep">&middot;</span>
    <span class="timer-wpm">{{ wpm }} WPM</span>
    <div class="timer-controls">
      <button
        v-if="!isRunning && elapsed === 0"
        class="timer-btn"
        title="开始计时"
        @click="start"
        aria-label="开始计时"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <polygon points="5 3 19 12 5 21 5 3" />
        </svg>
      </button>
      <button
        v-else-if="isRunning"
        class="timer-btn"
        title="暂停"
        @click="pause"
        aria-label="暂停"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <rect x="6" y="4" width="4" height="16" />
          <rect x="14" y="4" width="4" height="16" />
        </svg>
      </button>
      <button
        v-else
        class="timer-btn"
        title="继续"
        @click="start"
        aria-label="继续"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <polygon points="5 3 19 12 5 21 5 3" />
        </svg>
      </button>
      <button
        class="timer-btn"
        :disabled="elapsed === 0"
        title="重置"
        @click="reset"
        aria-label="重置"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="1 4 1 10 7 10" />
          <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'

interface Props {
  wordCount: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:seconds': [seconds: number]
}>()

const elapsed = ref(0)
const isRunning = ref(false)
let intervalId: ReturnType<typeof setInterval> | null = null

const formattedTime = computed(() => {
  const mins = Math.floor(elapsed.value / 60)
  const secs = elapsed.value % 60
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
})

const wpm = computed(() => {
  if (elapsed.value === 0) return 0
  return Math.round((props.wordCount / elapsed.value) * 60)
})

function start() {
  if (isRunning.value) return
  isRunning.value = true
  intervalId = setInterval(() => {
    elapsed.value++
    emit('update:seconds', elapsed.value)
  }, 1000)
}

function pause() {
  if (!isRunning.value) return
  isRunning.value = false
  if (intervalId !== null) {
    clearInterval(intervalId)
    intervalId = null
  }
}

function reset() {
  pause()
  elapsed.value = 0
  emit('update:seconds', 0)
}

onUnmounted(() => {
  if (intervalId !== null) {
    clearInterval(intervalId)
    intervalId = null
  }
})
</script>

<style scoped>
.reading-timer {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-1) var(--space-3);
  background: var(--color-surface-muted);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-family: var(--font-mono);
  font-size: 0.8125rem;
  line-height: 1;
  color: var(--color-text);
}

.timer-icon {
  font-size: 0.875rem;
  flex-shrink: 0;
}

.timer-time {
  font-weight: 600;
  letter-spacing: 0.02em;
  min-width: 40px;
  text-align: center;
}

.timer-sep {
  color: var(--color-text-muted);
}

.timer-wpm {
  color: var(--color-text-muted);
  font-weight: 500;
  min-width: 58px;
}

.timer-controls {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  margin-left: var(--space-1);
  padding-left: var(--space-2);
  border-left: 1px solid var(--color-border);
}

.timer-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text-muted);
  cursor: pointer;
  transition: background-color 0.16s ease, color 0.16s ease, border-color 0.16s ease;
}

.timer-btn:hover:not(:disabled) {
  background: var(--color-primary);
  color: var(--color-primary-foreground);
  border-color: var(--color-primary);
}

.timer-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.timer-btn:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}
</style>
