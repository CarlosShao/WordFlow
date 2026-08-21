<template>
  <div class="source-pagination" :class="`theme-${theme}`">
    <div class="pagination-info">
      共 <span class="total">{{ total }}</span> 条 · 第 {{ page }}/{{ totalPages }} 页
    </div>
    <div class="pagination-controls">
      <button
        class="page-btn nav"
        :disabled="page <= 1"
        :aria-label="'上一页'"
        @click="changePage(page - 1)"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>
      <button
        v-for="p in pageNumbers"
        :key="p"
        class="page-btn"
        :class="{ active: p === page, ellipsis: p === '…' }"
        :disabled="p === '…'"
        @click="changePage(p)"
      >
        {{ p }}
      </button>
      <button
        class="page-btn nav"
        :disabled="page >= totalPages"
        :aria-label="'下一页'"
        @click="changePage(page + 1)"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>
    </div>
    <div class="pagination-size">
      <select
        :value="pageSize"
        class="size-select"
        aria-label="每页条数"
        @change="onSizeChange"
      >
        <option :value="6">6 / 页</option>
        <option :value="12">12 / 页</option>
        <option :value="24">24 / 页</option>
        <option :value="48">48 / 页</option>
      </select>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  page: number
  total: number
  pageSize: number
  /** theme token: 'default' | 'steve' | 'ted' | 'snl' | 'key-peele' | 'article' */
  theme?: string
}>()

const emit = defineEmits<{
  (e: 'update:page', page: number): void
  (e: 'update:pageSize', size: number): void
}>()

const totalPages = computed(() => Math.max(1, Math.ceil(props.total / props.pageSize)))

/** Compact page-number list with ellipses, e.g. [1, '…', 4, 5, 6, '…', 20] */
const pageNumbers = computed<(number | '…')[]>(() => {
  const total = totalPages.value
  const cur = props.page
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1)
  }
  const pages = new Set<number>([1, total])
  for (let d = -1; d <= 1; d++) {
    const p = cur + d
    if (p >= 1 && p <= total) pages.add(p)
  }
  if (cur > 3) pages.add(2)
  if (cur < total - 2) pages.add(total - 1)
  const sorted = Array.from(pages).sort((a, b) => a - b)
  const out: (number | '…')[] = []
  let prev = 0
  for (const p of sorted) {
    if (p - prev > 1) out.push('…')
    out.push(p)
    prev = p
  }
  return out
})

function changePage(p: number | '…') {
  if (typeof p !== 'number') return
  if (p < 1 || p > totalPages.value || p === props.page) return
  emit('update:page', p)
}

function onSizeChange(e: Event) {
  const val = Number((e.target as HTMLSelectElement).value)
  if (val > 0 && val !== props.pageSize) {
    emit('update:pageSize', val)
  }
}
</script>

<style scoped>
.source-pagination {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  flex-wrap: wrap;
  margin-top: var(--space-4);
  padding-top: var(--space-3);
  border-top: 1px solid var(--color-border);
}

/* ── Info label ─────────────────────────────────────────────── */
.pagination-info {
  font-size: 0.8125rem;
  color: var(--color-text-muted);
  font-family: var(--font-sans);
}
.pagination-info .total {
  font-weight: 700;
  color: var(--color-text);
}

/* ── Controls ───────────────────────────────────────────────── */
.pagination-controls {
  display: flex;
  align-items: center;
  gap: 4px;
}

.page-btn {
  min-width: 32px;
  height: 32px;
  padding: 0 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8125rem;
  font-weight: 600;
  font-family: var(--font-sans);
  color: var(--color-text-muted);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.16s ease;
  line-height: 1;
}

.page-btn:hover:not(:disabled):not(.ellipsis) {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.page-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.page-btn.ellipsis {
  background: transparent;
  border-color: transparent;
  cursor: default;
}

.page-btn.active {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: var(--color-primary-foreground);
}

.page-btn.nav {
  padding: 0 8px;
}

/* ── Size selector ──────────────────────────────────────────── */
.pagination-size {
  display: flex;
  align-items: center;
}
.size-select {
  padding: 4px 8px;
  font-size: 0.8125rem;
  font-family: var(--font-sans);
  color: var(--color-text);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  cursor: pointer;
  outline: none;
}

/* ── Theme tokens (per-source styling) ──────────────────────── */
/* All sources share the same primary-theme pagination to keep the
   page visually consistent.  The `theme` prop is kept for API compat
   but no longer generates per-source color overrides. */
</style>
