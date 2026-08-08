<template>
  <div :class="['spinner', `spinner--${size}`]" role="status" aria-label="加载中">
    <div class="spinner__circle" />
  </div>
</template>

<script setup lang="ts">
interface Props {
  size?: 'sm' | 'md' | 'lg'
}

withDefaults(defineProps<Props>(), {
  size: 'md'
})
</script>

<style scoped>
.spinner {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.spinner__circle {
  border-radius: 50%;
  border-style: solid;
  border-color: var(--color-surface-muted);
  border-top-color: var(--color-primary);
  animation: spin 0.6s linear infinite;
}

/* Sizes */
.spinner--sm .spinner__circle {
  width: 16px;
  height: 16px;
  border-width: 2px;
}

.spinner--md .spinner__circle {
  width: 24px;
  height: 24px;
  border-width: 3px;
}

.spinner--lg .spinner__circle {
  width: 40px;
  height: 40px;
  border-width: 4px;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}
</style>
