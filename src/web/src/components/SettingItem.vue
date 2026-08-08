<template>
  <div :class="['setting-item', { 'setting-item--full': fullWidth }]">
    <div class="setting-label">
      <slot name="label">
        <h3>{{ title }}</h3>
        <p v-if="description">{{ description }}</p>
      </slot>
    </div>
    <div :class="['setting-control', { 'setting-control--full': fullWidth }]">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
interface Props {
  title?: string
  description?: string
  fullWidth?: boolean
}

withDefaults(defineProps<Props>(), {
  title: '',
  description: '',
  fullWidth: false
})
</script>

<style scoped>
.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  padding: var(--space-3) 0;
}

.setting-item:not(:last-child) {
  border-bottom: 1px solid var(--color-border);
}

.setting-item--full {
  flex-direction: column;
  align-items: flex-start;
}

.setting-label {
  flex: 1;
}

.setting-label h3 {
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--color-text);
  margin-bottom: var(--space-1);
}

.setting-label p {
  font-size: 0.8125rem;
  color: var(--color-text-muted);
}

.setting-control {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-shrink: 0;
}

.setting-control--full {
  width: 100%;
  flex-shrink: 1;
}
</style>
