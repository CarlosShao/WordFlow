<template>
  <div class="flashcard-wrapper" :class="{ flipped }" @click="flipped = !flipped">
    <div class="flashcard-inner">
      <!-- Front -->
      <div class="flashcard-front">
        <div class="flashcard-front-content">
          <h2 class="fc-word">{{ front.word }}</h2>
          <p v-if="front.phonetic" class="fc-phonetic font-mono">{{ front.phonetic }}</p>
          <p v-if="front.partOfSpeech" class="fc-pos">{{ front.partOfSpeech }}</p>
        </div>
        <span class="fc-hint">点击翻转</span>
      </div>
      <!-- Back -->
      <div class="flashcard-back">
        <div class="flashcard-back-content">
          <h3 class="fc-definition">{{ back.chineseDefinition }}</h3>
          <p class="fc-en-def">{{ back.definition }}</p>
          <div v-if="back.example" class="fc-example">
            <p class="fc-example-en">"{{ back.example.english }}"</p>
            <p class="fc-example-zh">{{ back.example.chinese }}</p>
          </div>
        </div>
        <span class="fc-hint">点击翻回</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

interface Props {
  front: {
    word: string
    phonetic?: string
    partOfSpeech?: string
  }
  back: {
    definition: string
    chineseDefinition: string
    example?: {
      english: string
      chinese: string
    }
  }
}

defineProps<Props>()

const flipped = ref(false)

function flip() {
  flipped.value = !flipped.value
}

function reset() {
  flipped.value = false
}

defineExpose({ flip, reset })
</script>

<style scoped>
.flashcard-wrapper {
  width: 100%;
  max-width: 400px;
  height: 300px;
  perspective: 1200px;
  cursor: pointer;
  margin: 0 auto;
}

.flashcard-inner {
  position: relative;
  width: 100%;
  height: 100%;
  transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
  transform-style: preserve-3d;
}

.flashcard-wrapper.flipped .flashcard-inner {
  transform: rotateY(180deg);
}

.flashcard-front,
.flashcard-back {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
  padding: var(--space-6);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
}

.flashcard-back {
  transform: rotateY(180deg);
}

.flashcard-front-content,
.flashcard-back-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
  flex: 1;
  justify-content: center;
}

.fc-word {
  font-size: 2rem;
  font-weight: 700;
  color: var(--color-text);
  letter-spacing: -0.02em;
}

.fc-phonetic {
  font-size: 1rem;
  color: var(--color-text-muted);
}

.fc-pos {
  font-size: 0.8125rem;
  color: var(--color-text-muted);
  padding: 2px 10px;
  background: var(--color-surface-muted);
  border-radius: 999px;
}

.fc-definition {
  font-size: 1.375rem;
  font-weight: 600;
  color: var(--color-text);
  text-align: center;
  margin-bottom: var(--space-1);
}

.fc-en-def {
  font-size: 0.875rem;
  color: var(--color-text-muted);
  text-align: center;
  line-height: 1.5;
}

.fc-example {
  padding: var(--space-3);
  background: var(--color-surface-muted);
  border-radius: var(--radius-md);
  text-align: center;
  max-width: 100%;
}

.fc-example-en {
  font-size: 0.875rem;
  color: var(--color-text);
  font-style: italic;
  line-height: 1.5;
  margin-bottom: var(--space-1);
}

.fc-example-zh {
  font-size: 0.8125rem;
  color: var(--color-text-muted);
}

.fc-hint {
  font-size: 0.6875rem;
  color: var(--color-text-muted);
  opacity: 0.6;
}

.flashcard-wrapper:hover .flashcard-inner {
  box-shadow: var(--shadow-lg);
}

.flashcard-wrapper:hover .flashcard-front,
.flashcard-wrapper:hover .flashcard-back {
  border-color: var(--color-border-strong);
}
</style>
