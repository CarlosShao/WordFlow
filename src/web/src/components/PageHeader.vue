<template>
  <header class="page-header">
    <h1 class="page-title">{{ title }}</h1>
    <p v-if="subtitle" class="page-subtitle">{{ subtitle }}</p>
  </header>
</template>

<script setup lang="ts">
interface Props {
  title: string
  subtitle?: string
}

defineProps<Props>()
</script>

<style scoped>
.page-header {
  margin-bottom: var(--space-6);
}

.page-title {
  font-size: var(--page-title-size);
  font-weight: var(--page-title-weight);
  line-height: var(--line-height-tight);
  color: var(--color-text);
  margin-bottom: var(--space-1);
}

.page-subtitle {
  font-size: var(--page-subtitle-size);
  color: var(--color-text-muted);
}

@media (max-width: 480px) {
  .page-title {
    font-size: var(--font-size-3xl);
  }
}
</style>
