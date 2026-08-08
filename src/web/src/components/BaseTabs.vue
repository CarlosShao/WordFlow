<template>
  <nav class="tabs" :class="{ 'is-disabled': disabled }">
    <button
      v-for="tab in tabs"
      :key="tab.value"
      :class="['tab-item', { active: modelValue === tab.value }]"
      :disabled="disabled"
      @click="$emit('update:modelValue', tab.value)"
    >
      {{ tab.label }}
    </button>
  </nav>
</template>

<script setup lang="ts">
interface Tab {
  value: string
  label: string
}

interface Props {
  modelValue: string
  tabs: Tab[]
  disabled?: boolean
}

withDefaults(defineProps<Props>(), {
  disabled: false
})

defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>

<style scoped>
.tabs {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 2px;
  background: var(--color-surface-muted);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.tabs.is-disabled {
  opacity: 0.45;
  pointer-events: none;
}

.tab-item {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 32px;
  padding: 0 var(--space-3);
  border-radius: var(--radius-md);
  background: transparent;
  color: var(--color-text-muted);
  font-size: 0.8125rem;
  font-weight: 500;
  white-space: nowrap;
  cursor: pointer;
  transition: background-color 0.16s ease, color 0.16s ease;
}

.tab-item:hover:not(:disabled):not(.active) {
  color: var(--color-text);
}

.tab-item.active {
  background: var(--color-surface);
  color: var(--color-text);
  box-shadow: var(--shadow-xs);
}

.tab-item:disabled {
  cursor: not-allowed;
}
</style>
