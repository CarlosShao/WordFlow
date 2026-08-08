<template>
  <Teleport to="body">
    <Transition name="tooltip">
      <div
        v-if="visible"
        class="word-tooltip"
        :style="tooltipStyle"
        @mouseenter="keepOpen"
        @mouseleave="close"
      >
        <div class="tooltip-header">
          <span class="tooltip-word">{{ word }}</span>
          <span v-if="phonetic" class="tooltip-phonetic font-mono">{{ phonetic }}</span>
        </div>
        <div class="tooltip-body">
          <p v-if="pos" class="tooltip-pos">{{ pos }}</p>
          <p class="tooltip-def">{{ definition }}</p>
          <p v-if="chineseDefinition" class="tooltip-cn">{{ chineseDefinition }}</p>
        </div>
        <div class="tooltip-actions">
          <button class="tooltip-action" @click.stop="$emit('add-vocabulary')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            收藏
          </button>
          <button class="tooltip-action" @click.stop="$emit('view-detail')">
            详情
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M7 17l9.2-9.2M17 17V7.8H7.8"/>
            </svg>
          </button>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  visible: boolean
  x: number
  y: number
  word: string
  phonetic?: string
  pos?: string
  definition: string
  chineseDefinition?: string
}

const props = defineProps<Props>()

defineEmits<{
  'add-vocabulary': []
  'view-detail': []
  close: []
}>()

const tooltipWidth = 280
const tooltipHeight = 160

const tooltipStyle = computed(() => {
  let left = props.x
  let top = props.y - tooltipHeight - 8

  // Keep within viewport
  if (left + tooltipWidth > window.innerWidth - 16) {
    left = window.innerWidth - tooltipWidth - 16
  }
  if (left < 16) left = 16
  if (top < 16) {
    top = props.y + 24 // show below instead
  }

  return {
    left: `${left}px`,
    top: `${top}px`
  }
})

function keepOpen() {}
function close() {}
</script>

<style scoped>
.word-tooltip {
  position: fixed;
  z-index: 1200;
  width: 280px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
}

.tooltip-header {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
  padding: var(--space-3) var(--space-3) var(--space-2);
}

.tooltip-word {
  font-size: 1.125rem;
  font-weight: 700;
  color: var(--color-text);
}

.tooltip-phonetic {
  font-size: 0.8125rem;
  color: var(--color-text-muted);
}

.tooltip-body {
  padding: 0 var(--space-3) var(--space-2);
}

.tooltip-pos {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  margin-bottom: var(--space-1);
}

.tooltip-def {
  font-size: 0.875rem;
  color: var(--color-text);
  line-height: 1.5;
}

.tooltip-cn {
  font-size: 0.8125rem;
  color: var(--color-text-muted);
  margin-top: 2px;
}

.tooltip-actions {
  display: flex;
  gap: var(--space-1);
  padding: var(--space-2) var(--space-3);
  border-top: 1px solid var(--color-border);
  background: var(--color-surface-muted);
}

.tooltip-action {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--color-text-muted);
  border-radius: var(--radius-sm);
  transition: all 0.16s ease;
}

.tooltip-action:hover {
  background: var(--color-surface);
  color: var(--color-text);
}

/* Transition */
.tooltip-enter-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.tooltip-leave-active {
  transition: opacity 0.1s ease;
}
.tooltip-enter-from {
  opacity: 0;
  transform: translateY(4px);
}
.tooltip-leave-to {
  opacity: 0;
}
</style>
