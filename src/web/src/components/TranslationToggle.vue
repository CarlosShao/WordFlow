<template>
  <div class="translation-toggle" role="radiogroup" aria-label="翻译显示模式">
    <button
      v-for="option in options"
      :key="option.value"
      :class="['toggle-btn', { active: modelValue === option.value }]"
      role="radio"
      :aria-checked="modelValue === option.value"
      @click="emit('update:modelValue', option.value)"
    >
      {{ option.label }}
    </button>
  </div>
</template>

<script setup lang="ts">
interface Props {
  modelValue: 'original' | 'bilingual' | 'translated'
}

defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: 'original' | 'bilingual' | 'translated']
}>()

const options = [
  { value: 'original' as const, label: '原文' },
  { value: 'bilingual' as const, label: '对照' },
  { value: 'translated' as const, label: '译文' }
]
</script>

<style scoped>
.translation-toggle {
  display: inline-flex;
  align-items: center;
  padding: 2px;
  background: var(--color-surface-muted);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.toggle-btn {
  padding: var(--space-1) var(--space-3);
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--color-text-muted);
  background: transparent;
  border: 1px solid transparent;
  border-radius: calc(var(--radius-md) - 2px);
  cursor: pointer;
  transition: background-color 0.16s ease, color 0.16s ease, border-color 0.16s ease;
  white-space: nowrap;
}

.toggle-btn:hover:not(.active) {
  color: var(--color-text);
  background: var(--color-surface);
}

.toggle-btn.active {
  background: var(--color-primary);
  color: var(--color-primary-foreground);
  border-color: var(--color-primary);
}

.toggle-btn:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}
</style>
