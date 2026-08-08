<template>
  <article :class="['card', variant, { 'is-disabled': disabled }]">
    <div v-if="$slots.header" class="card-header">
      <slot name="header" />
    </div>
    <div class="card-body">
      <slot />
    </div>
    <div v-if="$slots.footer" class="card-footer">
      <slot name="footer" />
    </div>
  </article>
</template>

<script setup lang="ts">
interface Props {
  variant?: 'default' | 'metric' | 'detail'
  disabled?: boolean
}

withDefaults(defineProps<Props>(), {
  variant: 'default',
  disabled: false
})
</script>

<style scoped>
.card {
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding: var(--card-padding);
  border: var(--card-border-width) solid var(--color-border);
  border-radius: var(--card-radius);
  background: var(--color-surface);
  box-shadow: var(--card-shadow);
  transition: border-color 0.16s ease, box-shadow 0.16s ease;
}

.card:hover:not(.is-disabled) {
  border-color: var(--color-border-strong);
}

.card.is-disabled {
  opacity: 0.56;
  background: var(--color-surface-muted);
  pointer-events: none;
}

/* Header */
.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-2);
  padding-bottom: var(--space-2);
  border-bottom: 1px solid var(--color-border);
}

/* Body */
.card-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

/* Footer */
.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: var(--space-2);
  padding-top: var(--space-2);
  border-top: 1px solid var(--color-border);
}

/* Variants */
.metric {
  flex: 1 1 154px;
}

.detail {
  flex: 1 1 220px;
  background: var(--color-surface-muted);
}
</style>
