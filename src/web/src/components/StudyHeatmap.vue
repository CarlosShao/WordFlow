<template>
  <div class="heatmap-container">
    <!-- Month Labels -->
    <div class="heatmap-months">
      <span v-for="m in monthLabels" :key="m.label" :style="{ gridColumnStart: m.start }">
        {{ m.label }}
      </span>
    </div>
    <div class="heatmap-body">
      <!-- Day Labels -->
      <div class="heatmap-days">
        <span>一</span>
        <span></span>
        <span>三</span>
        <span></span>
        <span>五</span>
        <span></span>
        <span>日</span>
      </div>
      <!-- Grid -->
      <div class="heatmap-grid">
        <div
          v-for="day in gridData"
          :key="day.date"
          :class="['heatmap-cell', `level-${day.level}`]"
          :title="`${day.date}: ${day.count}个单词`"
        />
      </div>
    </div>
    <!-- Legend -->
    <div class="heatmap-legend">
      <span class="legend-label">少</span>
      <div class="legend-cell level-0" />
      <div class="legend-cell level-1" />
      <div class="legend-cell level-2" />
      <div class="legend-cell level-3" />
      <div class="legend-cell level-4" />
      <span class="legend-label">多</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface DayData {
  date: string
  count: number
}

interface Props {
  data: DayData[]
}

const props = defineProps<Props>()

const gridData = computed(() => {
  return props.data.map(day => ({
    ...day,
    level: day.count === 0 ? 0 : day.count === 1 ? 1 : day.count <= 3 ? 2 : day.count <= 5 ? 3 : 4
  }))
})

const monthLabels = computed(() => {
  const labels: { label: string; start: number }[] = []
  let lastMonth = -1

  props.data.forEach((day, index) => {
    const date = new Date(day.date)
    const month = date.getMonth()
    if (month !== lastMonth) {
      const weekIndex = Math.floor(index / 7) + 1
      const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
      labels.push({ label: monthNames[month], start: weekIndex })
      lastMonth = month
    }
  })

  return labels
})
</script>

<style scoped>
.heatmap-container {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  overflow-x: auto;
}

.heatmap-months {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: 14px;
  gap: 3px;
  padding-left: 28px;
  font-size: 0.6875rem;
  color: var(--color-text-muted);
}

.heatmap-body {
  display: flex;
  gap: var(--space-1);
}

.heatmap-days {
  display: flex;
  flex-direction: column;
  gap: 3px;
  font-size: 0.625rem;
  color: var(--color-text-muted);
  width: 20px;
  flex-shrink: 0;
}

.heatmap-days span {
  height: 12px;
  display: flex;
  align-items: center;
}

.heatmap-grid {
  display: grid;
  grid-template-rows: repeat(7, 12px);
  grid-auto-flow: column;
  grid-auto-columns: 12px;
  gap: 3px;
}

.heatmap-cell {
  width: 12px;
  height: 12px;
  border-radius: 2px;
  transition: transform 0.12s ease;
}

.heatmap-cell:hover {
  transform: scale(1.3);
  outline: 1px solid var(--color-border-strong);
}

.level-0 { background: var(--color-surface-muted); }
.level-1 { background: var(--color-brand-200); }
.level-2 { background: var(--color-brand-400); }
.level-3 { background: var(--color-brand-600); }
.level-4 { background: var(--color-primary); }

/* Legend */
.heatmap-legend {
  display: flex;
  align-items: center;
  gap: 3px;
  justify-content: flex-end;
  padding-top: var(--space-1);
}

.legend-label {
  font-size: 0.625rem;
  color: var(--color-text-muted);
  margin: 0 2px;
}

.legend-cell {
  width: 12px;
  height: 12px;
  border-radius: 2px;
}
</style>
