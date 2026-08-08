<template>
  <div class="empty-state">
    <div class="empty-state__icon" v-if="icon">
      <template v-if="icon.startsWith('M') || icon.startsWith('m')">
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
          <path :d="icon" />
        </svg>
      </template>
      <template v-else>
        <span class="empty-state__emoji">{{ icon }}</span>
      </template>
    </div>

    <h3 class="empty-state__title">{{ title }}</h3>
    <p v-if="description" class="empty-state__desc">{{ description }}</p>
    <button
      v-if="actionText"
      class="empty-state__action"
      @click="$emit('action')"
    >
      {{ actionText }}
    </button>
  </div>
</template>

<script setup lang="ts">
interface Props {
  icon?: string
  title: string
  description?: string
  actionText?: string
}

defineProps<Props>()

defineEmits<{
  action: []
}>()
</script>

<style scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: var(--space-10) var(--space-6);
  gap: var(--space-3);
}

.empty-state__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  color: var(--color-text-muted);
  margin-bottom: var(--space-2);
}

.empty-state__emoji {
  font-size: 48px;
  line-height: 1;
}

.empty-state__icon svg {
  width: 48px;
  height: 48px;
}

.empty-state__title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text);
  font-family: var(--font-sans);
  margin: 0;
}

.empty-state__desc {
  font-size: 0.875rem;
  color: var(--color-text-muted);
  font-family: var(--font-sans);
  margin: 0;
  max-width: 280px;
  line-height: 1.5;
}

.empty-state__action {
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

.empty-state__action:hover {
  filter: brightness(0.96);
}

.empty-state__action:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}
</style>
