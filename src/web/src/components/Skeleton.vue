<template>
  <div :class="['skeleton', `skeleton--${variant}`]" role="status" aria-label="加载中">
    <!-- Text variant -->
    <template v-if="variant === 'text'">
      <div
        v-for="i in lines"
        :key="i"
        class="skeleton__line"
        :style="{ width: textLineWidths[(i - 1) % textLineWidths.length] }"
      />
    </template>

    <!-- Card variant -->
    <template v-else-if="variant === 'card'">
      <div class="skeleton__card-block" />
      <div class="skeleton__line" style="width: 80%" />
      <div class="skeleton__line" style="width: 60%" />
    </template>

    <!-- Table variant -->
    <template v-else-if="variant === 'table'">
      <div class="skeleton__table-header">
        <div class="skeleton__line skeleton__line--header" />
      </div>
      <div v-for="i in 4" :key="i" class="skeleton__table-row">
        <div class="skeleton__line skeleton__line--cell" />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
interface Props {
  lines?: number
  variant?: 'text' | 'card' | 'table'
}

const props = withDefaults(defineProps<Props>(), {
  lines: 3,
  variant: 'text'
})

const textLineWidths = ['100%', '80%', '60%']
</script>

<style scoped>
.skeleton {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.skeleton__line {
  height: 14px;
  border-radius: var(--radius-sm);
  background: var(--color-surface-muted);
  position: relative;
  overflow: hidden;
}

.skeleton__line::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.4) 50%,
    transparent 100%
  );
  animation: shimmer 1.5s infinite;
}

/* Card variant */
.skeleton__card-block {
  height: 200px;
  border-radius: var(--radius-md);
  background: var(--color-surface-muted);
  position: relative;
  overflow: hidden;
}

.skeleton__card-block::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.4) 50%,
    transparent 100%
  );
  animation: shimmer 1.5s infinite;
}

/* Table variant */
.skeleton__table-header {
  background: var(--color-surface-subtle);
  border-radius: var(--radius-sm) var(--radius-sm) 0 0;
  padding: var(--space-3) var(--space-4);
}

.skeleton__line--header {
  height: 12px;
  width: 40%;
}

.skeleton__table-row {
  padding: var(--space-3) var(--space-4);
  border-top: 1px solid var(--color-border);
}

.skeleton__table-row:last-child {
  border-radius: 0 0 var(--radius-sm) var(--radius-sm);
}

.skeleton__line--cell {
  height: 12px;
  width: 70%;
}

@keyframes shimmer {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}
</style>
