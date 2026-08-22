<template>
  <aside
    class="sidebar"
    :class="{ collapsed, 'is-disabled': disabled, resizing }"
  >
    <!-- Brand -->
    <div class="sidebar-header">
      <div class="sidebar-brand">
        <slot name="brand">
          <span class="brand-text">{{ brand }}</span>
        </slot>
      </div>
    </div>

    <nav class="sidebar-nav">
      <slot :compact="false" />
    </nav>

    <div v-if="$slots.footer" class="sidebar-footer">
      <slot name="footer" />
    </div>

    <!-- Resize handle (right edge) -->
    <div
      v-if="!collapsed"
      class="sidebar-resize-handle"
      @mousedown.prevent="startResize"
    />
  </aside>
</template>

<script setup lang="ts">
import { ref } from 'vue'

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
  minWidth: 180,
  maxWidth: 400,
})

defineEmits<{
  'update:collapsed': [v: boolean]
}>()

// ── Resize state ───────────────────────────────────────────────
const currentWidth = ref(props.defaultWidth)
const resizing = ref(false)
let startX = 0
let startWidth = 0

function applyWidth(w: number) {
  currentWidth.value = w
  document.documentElement.style.setProperty('--app-sidebar-width', `${w}px`)
}

function startResize(e: MouseEvent) {
  resizing.value = true
  startX = e.clientX
  startWidth = currentWidth.value
  document.body.style.userSelect = 'none'
  document.body.style.cursor = 'col-resize'
  document.addEventListener('mousemove', onResize)
  document.addEventListener('mouseup', stopResize)
}

function onResize(e: MouseEvent) {
  if (!resizing.value) return
  const delta = e.clientX - startX
  const w = Math.min(props.maxWidth, Math.max(props.minWidth, startWidth + delta))
  applyWidth(w)
}

function stopResize() {
  if (resizing.value) {
    resizing.value = false
    document.body.style.userSelect = ''
    document.body.style.cursor = ''
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
    applyWidth(w)
  } else {
    applyWidth(props.defaultWidth)
  }
} else {
  applyWidth(props.defaultWidth)
}
</script>

<style scoped>
.sidebar {
  width: var(--app-sidebar-width, 224px);
  position: fixed;
  top: 0;
  bottom: 0;
  left: 0;
  display: flex;
  flex-direction: column;
  background: var(--color-sidebar);
  border-right: 1px solid var(--color-sidebar-border);
  flex-shrink: 0;
  z-index: var(--z-sticky);
  transition: width 0.22s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}

/* Disable transition during active resize for 1:1 pointer tracking */
.sidebar.resizing {
  transition: none !important;
}

.sidebar.collapsed {
  width: 0 !important;
  border-right-color: transparent;
}

.sidebar.is-disabled {
  opacity: 0.46;
  pointer-events: none;
}

/* ── Header (brand) ──────────────────────────────────────────── */

.sidebar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4) var(--space-4) var(--space-3);
  gap: var(--space-2);
  flex-shrink: 0;
}

.sidebar-brand {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex: 1;
  min-width: 0;
}

.brand-text {
  font-weight: var(--sidebar-brand-weight);
  font-size: var(--sidebar-brand-size);
  color: var(--color-sidebar-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ── Navigation ──────────────────────────────────────────────── */

.sidebar-nav {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  padding: 0 var(--space-3);
  overflow-y: auto;
  overflow-x: hidden;
}

/* ── Footer ──────────────────────────────────────────────────── */

.sidebar-footer {
  padding: var(--space-3) var(--space-3) var(--space-4);
  border-top: 1px solid var(--color-sidebar-border);
  flex-shrink: 0;
}

/* ── Resize handle ───────────────────────────────────────────── */

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
  opacity: 0.4;
}

/* ── Scrollbar styling ──────────────────────────────────────── */

.sidebar-nav::-webkit-scrollbar {
  width: 4px;
}

.sidebar-nav::-webkit-scrollbar-track {
  background: transparent;
}

.sidebar-nav::-webkit-scrollbar-thumb {
  background: var(--color-border);
  border-radius: 2px;
}

.sidebar-nav::-webkit-scrollbar-thumb:hover {
  background: var(--color-border-strong);
}
</style>
