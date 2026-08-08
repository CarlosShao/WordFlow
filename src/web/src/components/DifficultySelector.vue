<template>
  <div class="difficulty-selector">
    <label v-if="label" class="difficulty-label">{{ label }}</label>
    <div class="difficulty-options">
      <button
        v-for="level in levels"
        :key="level.value"
        :class="['difficulty-btn', `diff-${level.value}`, { active: modelValue === level.value }]"
        @click="$emit('update:modelValue', level.value)"
      >
        {{ level.label }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CEFRLevel } from '../types'

interface DifficultyLevel {
  value: CEFRLevel
  label: string
}

interface Props {
  modelValue?: CEFRLevel | ''
  label?: string
  levels?: DifficultyLevel[]
}

withDefaults(defineProps<Props>(), {
  modelValue: '',
  label: '',
  levels: () => [
    { value: 'A1', label: 'A1 入门' },
    { value: 'A2', label: 'A2 基础' },
    { value: 'B1', label: 'B1 中级' },
    { value: 'B2', label: 'B2 中高级' },
    { value: 'C1', label: 'C1 高级' },
    { value: 'C2', label: 'C2 精通' }
  ]
})

defineEmits<{
  'update:modelValue': [value: CEFRLevel | '']
}>()
</script>

<style scoped>
.difficulty-selector {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.difficulty-label {
  font-size: var(--font-size-sm);
  font-weight: 600;
  color: var(--color-text);
}

.difficulty-options {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-1);
}

.difficulty-btn {
  padding: var(--space-1) var(--space-2);
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--color-text-muted);
  background: var(--color-surface-muted);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.16s ease;
}

.difficulty-btn:hover {
  background: var(--color-surface);
  color: var(--color-text);
}

.difficulty-btn.active {
  background: var(--color-primary);
  color: var(--color-primary-foreground);
  border-color: var(--color-primary);
}
</style>
