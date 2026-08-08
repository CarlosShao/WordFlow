<template>
  <span :class="['tag', variant, size]">
    <slot />
  </span>
</template>

<script setup lang="ts">
interface Props {
  variant?: 'default' | 'primary' | 'success' | 'danger' | 'muted'
  size?: 'sm' | 'md'
}

withDefaults(defineProps<Props>(), {
  variant: 'default',
  size: 'sm'
})
</script>

<style scoped>
.tag {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  border-radius: 999px;
  font-weight: 600;
  white-space: nowrap;
}

/* Sizes */
.sm {
  padding: 2px 8px;
  font-size: 0.6875rem;
}

.md {
  padding: 4px 10px;
  font-size: 0.75rem;
}

/* Variants */
.default {
  background: var(--color-surface-muted);
  color: var(--color-text-muted);
  border: 1px solid var(--color-border);
}

.primary {
  background: var(--color-primary);
  color: var(--color-primary-foreground);
}

.success {
  background: var(--color-success-50);
  color: var(--color-success-700);
  border: 1px solid var(--color-success-200);
}

.danger {
  background: var(--color-danger-50);
  color: var(--color-danger-700);
  border: 1px solid var(--color-danger-200);
}

.muted {
  background: transparent;
  color: var(--color-text-muted);
}
</style>
