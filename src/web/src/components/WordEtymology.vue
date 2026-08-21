<template>
  <div class="etymology">
    <div class="etymology-word">{{ word }}</div>
    <div class="etymology-flow">
      <template v-for="(part, idx) in parts" :key="idx">
        <div v-if="idx > 0" class="etymology-arrow">
          <svg width="32" height="16" viewBox="0 0 32 16" fill="none">
            <path d="M0 8H26M26 8L20 2M26 8L20 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </div>
        <div :class="['etymology-part', part.type]">
          <div class="part-text">{{ formatText(part) }}</div>
          <div class="part-type">{{ typeLabel(part.type) }}</div>
          <div class="part-meaning">{{ part.meaning }}</div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
interface WordPart {
  text: string
  type: 'prefix' | 'root' | 'suffix'
  meaning: string
}

interface Props {
  word: string
  parts: WordPart[]
}

defineProps<Props>()

function formatText(part: WordPart): string {
  if (part.type === 'prefix') return part.text + '-'
  if (part.type === 'suffix') return '-' + part.text
  return part.text
}

function typeLabel(type: string): string {
  const labels: Record<string, string> = {
    prefix: '前缀',
    root: '词根',
    suffix: '后缀',
  }
  return labels[type] || type
}
</script>

<style scoped>
.etymology {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-5);
}

.etymology-word {
  font-family: var(--font-serif);
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--color-text);
  letter-spacing: 0.02em;
}

.etymology-flow {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-wrap: wrap;
  justify-content: center;
}

.etymology-arrow {
  display: flex;
  align-items: center;
  color: var(--color-text-300);
  flex-shrink: 0;
}

.etymology-part {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
  border: 1.5px solid var(--color-border);
  background: var(--color-surface);
  min-width: 80px;
  text-align: center;
  box-shadow: var(--shadow-xs);
  transition: box-shadow 0.2s ease, transform 0.2s ease;
}

.etymology-part:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-1px);
}

/* Type-specific colors */
.etymology-part.prefix {
  border-color: var(--color-info-300);
  background: var(--color-info-50);
}

.etymology-part.prefix .part-text {
  color: var(--color-info-600);
}

.etymology-part.prefix .part-type {
  color: var(--color-info-500);
}

.etymology-part.root {
  border-color: var(--color-primary);
  background: var(--color-surface-subtle);
}

.etymology-part.root .part-text {
  color: var(--color-primary);
}

.etymology-part.root .part-type {
  color: var(--color-text-muted);
}

.etymology-part.suffix {
  border-color: var(--color-success-300);
  background: var(--color-success-50);
}

.etymology-part.suffix .part-text {
  color: var(--color-success-600);
}

.etymology-part.suffix .part-type {
  color: var(--color-success-500);
}

.part-text {
  font-family: var(--font-mono);
  font-size: 1rem;
  font-weight: 700;
  line-height: 1.2;
}

.part-type {
  font-size: 0.6875rem;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  opacity: 0.8;
}

.part-meaning {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  margin-top: 2px;
  line-height: 1.3;
}
</style>
