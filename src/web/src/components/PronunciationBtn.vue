<template>
  <button
    :class="['pron-btn', `pron-btn--${size}`]"
    :disabled="!speechSupported"
    :title="speechSupported ? '播放发音' : '浏览器不支持语音合成'"
    @click="speak"
    aria-label="播放发音"
  >
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
      :class="{ 'pron-btn__icon--playing': isPlaying }"
    >
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 010 7.07" />
      <path d="M19.07 4.93a10 10 0 010 14.14" />
    </svg>
  </button>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

interface Props {
  text: string
  lang?: string
  size?: 'sm' | 'md'
}

const props = withDefaults(defineProps<Props>(), {
  lang: 'en-US',
  size: 'sm'
})

const isPlaying = ref(false)

const speechSupported = computed(() => {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
})

function speak() {
  if (!speechSupported.value || !props.text) return

  // Cancel any ongoing speech
  window.speechSynthesis.cancel()

  const utterance = new SpeechSynthesisUtterance(props.text)
  utterance.lang = props.lang
  utterance.rate = 0.9

  isPlaying.value = true

  utterance.onend = () => {
    isPlaying.value = false
  }

  utterance.onerror = () => {
    isPlaying.value = false
  }

  window.speechSynthesis.speak(utterance)
}
</script>

<style scoped>
.pron-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  color: var(--color-text-muted);
  cursor: pointer;
  transition: background-color 0.16s ease, color 0.16s ease, border-color 0.16s ease;
  flex-shrink: 0;
}

.pron-btn:hover:not(:disabled) {
  background: var(--color-surface-muted);
  color: var(--color-primary);
  border-color: var(--color-border-strong);
}

.pron-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.pron-btn:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

/* Sizes */
.pron-btn--sm {
  width: 28px;
  height: 28px;
  padding: 0;
}

.pron-btn--sm svg {
  width: 14px;
  height: 14px;
}

.pron-btn--md {
  width: 36px;
  height: 36px;
  padding: 0;
}

.pron-btn--md svg {
  width: 18px;
  height: 18px;
}

/* Playing animation */
.pron-btn__icon--playing {
  animation: pulse 1s ease-in-out infinite;
  color: var(--color-primary);
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.6;
    transform: scale(1.15);
  }
}
</style>
