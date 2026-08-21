<template>
  <button
    :class="['sidebar-item', { active, 'is-disabled': disabled, compact }]"
    :disabled="disabled"
    @click="$emit('click', $event)"
  >
    <span class="item-dot" />
    <span v-if="!compact" class="item-label">
      <slot />
    </span>
    <span v-if="badge && !compact" class="item-badge">
      {{ badge }}
    </span>
  </button>
</template>

<script setup lang="ts">
interface Props {
  active?: boolean
  disabled?: boolean
  compact?: boolean
  badge?: string | number
}

withDefaults(defineProps<Props>(), {
  active: false,
  disabled: false,
  compact: false,
  badge: ''
})

defineEmits<{
  click: [event: MouseEvent]
}>()
</script>

<style scoped>
.sidebar-item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  width: 100%;
  min-height: 34px;
  padding: 0 var(--space-2);
  border: 0;
  border-radius: var(--sidebar-item-radius);
  background: transparent;
  color: var(--color-text-muted);
  font: inherit;
  font-size: 0.875rem;
  font-weight: 500;
  text-align: left;
  cursor: pointer;
  transition: background-color 0.16s ease, color 0.16s ease;
}

.sidebar-item:hover:not(:disabled):not(.active) {
  background: var(--color-sidebar-accent);
  color: var(--color-text);
}

.sidebar-item.active {
  background: var(--color-sidebar-primary);
  color: var(--sidebar-active-foreground, var(--color-primary-foreground));
  box-shadow: var(--shadow-xs);
}

.sidebar-item:disabled,
.sidebar-item.is-disabled {
  opacity: 0.46;
  cursor: not-allowed;
}

.item-dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: currentColor;
  opacity: 0.72;
  flex-shrink: 0;
}

.active .item-dot {
  opacity: 1;
}

.item-label {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 var(--space-1);
  border-radius: 999px;
  background: var(--color-primary);
  color: var(--color-primary-foreground);
  font-size: 0.6875rem;
  font-weight: 600;
}

.active .item-badge {
  background: var(--color-primary-foreground);
  color: var(--color-primary);
}

/* ── Compact mode ───────────────────────────────────────────── */

.sidebar-item.compact {
  justify-content: center;
  padding: 0;
}
</style>
