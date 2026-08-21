<template>
  <aside
    class="sidebar"
    :class="{ compact: collapsed, 'is-disabled': disabled }"
    :style="{ width: currentWidth + 'px' }"
  >
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

    <!-- Resize handle -->
    <div
      class="sidebar-resize-handle"
      @mousedown.prevent="startResize"
    />

    <!-- Collapse toggle -->
    <button
      class="sidebar-toggle"
      :title="collapsed ? '展开侧边栏' : '收起侧边栏'"
      @click="$emit('update:collapsed', !collapsed)"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline :points="collapsed ? '9 18 15 12 9 6' : '15 18 9 12 15 6'" />
      </svg>
    </button>
  </aside>
</template>

<script setup lang="ts">
interface Props {
  brand?: string
  collapsed?: boolean
  disabled?: boolean
  defaultWidth?: number
  minWidth?: number
  maxWidth?: number
}

const props = withDefaults(defineProps<Props>(), {
  brand: 'English Learner',
  collapsed: false,
  disabled: false,
  defaultWidth: 224,
  minWidth: 100,
  maxWidth: 400,
})

defineEmits<{
  'update:collapsed': [v: boolean]
}>()

// ── Resize state ───────────────────────────────────────────────

const currentWidth = ref(props.defaultWidth)
let resizing = false
let startX = 0
let startWidth = 0

function startResize(e: MouseEvent) {
  resizing = true
  startX = e.clientX
  startWidth = currentWidth.value
  document.addEventListener('mousemove', onResize)
  document.addEventListener('mouseup', stopResize)
}

function onResize(e: MouseEvent) {
  if (!resizing) return
  const delta = e.clientX - startX
  const w = Math.min(props.maxWidth, Math.max(props.minWidth, startWidth + delta))
  currentWidth.value = w
}

function stopResize() {
  if (resizing) {
    resizing = false
    document.removeEventListener('mousemove', onResize)
    document.removeEventListener('mouseup', stopResize)
    localStorage.setItem('sidebar-width', String(currentWidth.value))
  }
}

// Restore saved width
const saved = localStorage.getItem('sidebar-width')
if (saved) {
  const w = parseInt(saved, 10)
  if (w >= props.minWidth && w <= props.maxWidth) {
    currentWidth.value = w
  }
}
</script>

<style scoped>
.sidebar {
  width: var(--sidebar-width, 224px);
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-4);
  background: var(--color-sidebar);
  border-right: 1px solid var(--color-sidebar-border);
  position: relative;
  flex-shrink: 0;
}

.sidebar.compact {
  width: 72px;
  padding-inline: var(--space-2);
}

.sidebar.is-disabled {
  opacity: 0.46;
  pointer-events: none;
}

/* ── Resize handle ──────────────────────────────────────────── */

.sidebar-resize-handle {
  position: absolute;
  right: -3px;
  top: 0;
  bottom: 0;
  width: 7px;
  cursor: col-resize;
  z-index: var(--z-raised);
  background: transparent;
  transition: background 0.15s ease;
}

.sidebar-resize-handle:hover,
.sidebar-resize-handle:active {
  background: var(--color-primary);
  opacity: 0.5;
}

/* ── Collapse toggle ────────────────────────────────────────── */

.sidebar-toggle {
  position: absolute;
  bottom: var(--space-3);
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--color-sidebar-border);
  background: var(--color-surface);
  color: var(--color-text-muted);
  cursor: pointer;
  transition: all 0.15s ease;
}

.sidebar-toggle:hover {
  background: var(--color-surface-muted);
  color: var(--color-text);
  border-color: var(--color-border-strong);
}

.compact .sidebar-toggle {
  bottom: var(--space-2);
}

/* ── Brand ──────────────────────────────────────────────────── */

.sidebar-brand {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2);
  margin-bottom: var(--space-2);
}

.brand-text {
  font-weight: var(--sidebar-brand-weight);
  font-size: var(--sidebar-brand-size);
  color: var(--color-sidebar-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.compact .brand-text {
  font-size: 0;
}

.compact .brand-text::first-letter {
  font-size: 0.9375rem;
  font-weight: 700;
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
