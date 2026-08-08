<template>
  <div class="table-card" :class="{ 'is-disabled': disabled }">
    <table class="table" :class="{ compact }">
      <thead>
        <tr>
          <th v-for="col in columns" :key="col.key" :style="col.width ? { width: col.width } : undefined">
            {{ col.label }}
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-if="data.length === 0">
          <td :colspan="columns.length" class="empty-cell">
            {{ emptyText }}
          </td>
        </tr>
        <tr v-for="(row, index) in data" :key="index" :class="{ 'is-selected': selectedRow === index }" @click="$emit('row-click', row, index)">
          <td v-for="col in columns" :key="col.key">
            <slot :name="col.key" :row="row" :value="row[col.key]">
              {{ row[col.key] }}
            </slot>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
interface Column {
  key: string
  label: string
  width?: string
}

interface Props {
  columns: Column[]
  data: Record<string, any>[]
  compact?: boolean
  disabled?: boolean
  selectedRow?: number
  emptyText?: string
}

withDefaults(defineProps<Props>(), {
  compact: false,
  disabled: false,
  selectedRow: -1,
  emptyText: '暂无数据'
})

defineEmits<{
  'row-click': [row: Record<string, any>, index: number]
}>()
</script>

<style scoped>
.table-card {
  min-width: 0;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
}

.table-card.is-disabled {
  opacity: 0.45;
  pointer-events: none;
}

.table {
  width: 100%;
  border-collapse: collapse;
}

.table th,
.table td {
  padding: var(--space-3);
  border-bottom: 1px solid var(--color-border);
  text-align: left;
  font-size: 0.8125rem;
}

.table th {
  font-size: 0.6875rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--color-text-muted);
  background: var(--color-surface-muted);
}

.table td {
  color: var(--color-text);
}

.table tbody tr {
  cursor: pointer;
  transition: background-color 0.16s ease;
}

.table tbody tr:hover {
  background: var(--color-surface-muted);
}

.table tbody tr.is-selected {
  background: var(--color-surface-muted);
}

.compact th,
.compact td {
  padding: var(--space-2) var(--space-3);
}

.empty-cell {
  text-align: center;
  color: var(--color-text-muted);
  padding: var(--space-8) !important;
  background: var(--color-surface-muted);
}
</style>
