<template>
  <div class="error-state">
    <div class="error-state__icon">
      <svg
        width="48"
        height="48"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    </div>

    <h3 class="error-state__title">{{ title }}</h3>
    <p v-if="message" class="error-state__message">{{ message }}</p>
    <button class="error-state__retry" @click="$emit('retry')">
      {{ retryText }}
    </button>
  </div>
</template>

<script setup lang="ts">
interface Props {
  title?: string
  message?: string
  retryText?: string
}

withDefaults(defineProps<Props>(), {
  title: '加载失败',
  retryText: '重试'
})

defineEmits<{
  retry: []
}>()
</script>

<style scoped>
.error-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: var(--space-10) var(--space-6);
  gap: var(--space-3);
}

.error-state__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  color: var(--color-danger-600);
  margin-bottom: var(--space-2);
}

.error-state__icon svg {
  width: 48px;
  height: 48px;
}

.error-state__title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text);
  font-family: var(--font-sans);
  margin: 0;
}

.error-state__message {
  font-size: 0.875rem;
  color: var(--color-text-muted);
  font-family: var(--font-sans);
  margin: 0;
  max-width: 320px;
  line-height: 1.5;
}

.error-state__retry {
  margin-top: var(--space-2);
  padding: var(--space-2) var(--space-4);
  background: var(--color-primary);
  color: var(--color-primary-foreground);
  border: none;
  border-radius: var(--radius-md);
  font-size: 0.875rem;
  font-weight: 600;
  font-family: var(--font-sans);
  cursor: pointer;
  transition: filter 0.16s ease;
}

.error-state__retry:hover {
  filter: brightness(0.96);
}

.error-state__retry:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}
</style>
