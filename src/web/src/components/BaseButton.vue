<template>
  <button
    :class="[
      'btn',
      variant,
      size,
      { 'is-disabled': disabled, 'is-loading': loading }
    ]"
    :disabled="disabled || loading"
    @click="$emit('click', $event)"
  >
    <span v-if="loading" class="btn-spinner">
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.25"/>
        <path d="M14 8a6 6 0 0 0-6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
      </svg>
    </span>
    <span :class="{ 'is-hidden': loading }">
      <slot />
    </span>
  </button>
</template>

<script setup lang="ts">
interface Props {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'primary',
  size: 'md',
  disabled: false,
  loading: false
})

defineEmits<{
  click: [event: MouseEvent]
}>()
</script>

<style scoped>
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  min-width: 0;
  border: 1px solid transparent;
  border-radius: var(--btn-radius);
  box-shadow: var(--btn-shadow);
  text-transform: var(--btn-text-transform);
  letter-spacing: var(--btn-letter-spacing);
  font-weight: var(--btn-font-weight);
  border-width: var(--btn-border-width);
  cursor: pointer;
  transition: background-color 0.16s ease, border-color 0.16s ease, color 0.16s ease, box-shadow 0.16s ease;
  white-space: nowrap;
}

.btn:focus-visible {
  outline: 2px solid var(--focus-ring-color);
  outline-offset: var(--focus-ring-offset);
}

.btn:disabled,
.btn.is-disabled {
  cursor: not-allowed;
  opacity: 0.5;
  box-shadow: none;
}

.btn.is-loading {
  cursor: wait;
}

/* Sizes */
.sm {
  padding: var(--space-1) var(--space-3);
  font-size: var(--font-size-sm);
  line-height: var(--line-height-tight);
}

.md {
  padding: var(--space-2) var(--space-4);
  font-size: var(--font-size-base);
  line-height: var(--line-height-snug);
}

.lg {
  padding: var(--space-3) var(--space-5);
  font-size: var(--font-size-lg);
  line-height: var(--line-height-normal);
}

/* Variants */
.primary {
  background: var(--color-primary);
  color: var(--color-primary-foreground);
}

.primary:hover:not(:disabled),
.primary:active:not(:disabled) {
  filter: brightness(0.96);
}

.secondary {
  background: var(--color-surface);
  color: var(--color-text);
  border-color: var(--color-border);
}

.secondary:hover:not(:disabled),
.secondary:active:not(:disabled) {
  background: var(--color-surface-muted);
}

.ghost {
  background: transparent;
  color: var(--color-text);
}

.ghost:hover:not(:disabled),
.ghost:active:not(:disabled) {
  background: var(--color-surface-muted);
}

.danger {
  background: var(--color-danger-600);
  color: var(--color-primary-foreground);
}

.danger:hover:not(:disabled),
.danger:active:not(:disabled) {
  filter: brightness(0.94);
}

/* Loading Spinner */
.btn-spinner {
  display: inline-flex;
  animation: btn-spin 0.8s linear infinite;
}

.btn-text.is-hidden {
  opacity: 0;
}

@keyframes btn-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
