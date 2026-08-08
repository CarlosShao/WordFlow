<template>
  <div class="progress-wrapper">
    <div v-if="label" class="progress-label">
      <span>{{ label }}</span>
      <span v-if="showValue" class="progress-value">{{ value }}%</span>
    </div>
    <div class="progress-track" :class="[size]">
      <div
        class="progress-bar"
        :class="[variant]"
        :style="{ width: `${Math.min(100, Math.max(0, value))}%` }"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  value: number
  label?: string
  showValue?: boolean
  variant?: 'default' | 'success' | 'danger'
  size?: 'sm' | 'md'
}

withDefaults(defineProps<Props>(), {
  value: 0,
  label: '',
  showValue: true,
  variant: 'default',
  size: 'md'
})
</script>

<style scoped>
.progress-wrapper {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  min-width: 0;
}

.progress-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.8125rem;
  color: var(--color-text);
}

.progress-value {
  font-weight: 600;
  color: var(--color-text-muted);
}

.progress-track {
  width: 100%;
  overflow: hidden;
  background: var(--color-surface-muted);
  border-radius: 999px;
}

.sm {
  height: 4px;
}

.md {
  height: 8px;
}

.progress-bar {
  height: 100%;
  border-radius: 999px;
  transition: width 0.3s ease;
}

.default {
  background: var(--color-primary);
}

.success {
  background: var(--color-success-600);
}

.danger {
  background: var(--color-danger-600);
}
</style>
