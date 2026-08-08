<template>
  <aside class="sidebar" :class="{ compact, 'is-disabled': disabled }">
    <div class="sidebar-brand">
      <slot name="brand">
        <span class="brand-text">{{ brand }}</span>
      </slot>
    </div>
    <nav class="sidebar-nav">
      <slot />
    </nav>
    <div v-if="$slots.footer" class="sidebar-footer">
      <slot name="footer" />
    </div>
  </aside>
</template>

<script setup lang="ts">
interface Props {
  brand?: string
  compact?: boolean
  disabled?: boolean
}

withDefaults(defineProps<Props>(), {
  brand: 'English Learner',
  compact: false,
  disabled: false
})
</script>

<style scoped>
.sidebar {
  width: var(--sidebar-width);
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-4);
  background: var(--color-sidebar);
  border-right: 1px solid var(--color-sidebar-border);
}

.sidebar.compact {
  width: 86px;
  padding-inline: var(--space-3);
}

.sidebar.is-disabled {
  opacity: 0.46;
  pointer-events: none;
}

.sidebar-brand {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-2);
  margin-bottom: var(--space-2);
}

.brand-text {
  font-weight: var(--sidebar-brand-weight);
  font-size: var(--sidebar-brand-size);
  color: var(--color-sidebar-primary);
}

.compact .brand-text {
  font-size: 0.8125rem;
}

.sidebar-nav {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.sidebar-footer {
  margin-top: auto;
  padding-top: var(--space-3);
  border-top: 1px solid var(--color-sidebar-border);
}
</style>
