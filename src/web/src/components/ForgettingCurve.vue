<template>
  <div class="forgetting-curve">
    <svg
      :viewBox="`0 0 ${width} ${height}`"
      :width="width"
      :height="height"
      class="curve-svg"
    >
      <!-- Grid lines -->
      <line
        v-for="i in 4"
        :key="'gy' + i"
        :x1="padding.left"
        :y1="padding.top + (i - 1) * gridStepY"
        :x2="width - padding.right"
        :y2="padding.top + (i - 1) * gridStepY"
        stroke="var(--color-border)"
        stroke-dasharray="3 3"
        stroke-width="0.5"
      />

      <!-- Y-axis labels -->
      <text
        v-for="(val, i) in [100, 66, 33, 0]"
        :key="'yl' + i"
        :x="padding.left - 6"
        :y="padding.top + i * gridStepY + 4"
        text-anchor="end"
        class="axis-label"
      >
        {{ val }}
      </text>

      <!-- X-axis labels -->
      <text
        v-for="(label, i) in xLabels"
        :key="'xl' + i"
        :x="label.x"
        :y="height - 4"
        text-anchor="middle"
        class="axis-label"
      >
        {{ label.text }}
      </text>

      <!-- Ideal review schedule (dashed) -->
      <path
        v-if="idealPath"
        :d="idealPath"
        fill="none"
        stroke="var(--color-text-300)"
        stroke-width="1.5"
        stroke-dasharray="6 4"
      />

      <!-- Actual mastery curve -->
      <path
        v-if="curvePath"
        :d="curvePath"
        fill="none"
        stroke="var(--color-primary)"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />

      <!-- Fill area under curve -->
      <path
        v-if="areaPath"
        :d="areaPath"
        fill="var(--color-primary)"
        opacity="0.06"
      />

      <!-- Data points -->
      <circle
        v-for="(pt, i) in dataPoints"
        :key="'dp' + i"
        :cx="pt.x"
        :cy="pt.y"
        r="4"
        :fill="pt.mastery >= 70 ? 'var(--color-success-600)' : pt.mastery >= 40 ? 'var(--color-primary)' : 'var(--color-danger-600)'"
        stroke="var(--color-surface)"
        stroke-width="2"
      />

      <!-- Optimal review dots -->
      <circle
        v-for="(pt, i) in optimalDots"
        :key="'od' + i"
        :cx="pt.x"
        :cy="pt.y"
        r="3"
        fill="none"
        stroke="var(--color-text-300)"
        stroke-width="1.5"
        stroke-dasharray="2 2"
      />
    </svg>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Review {
  date: string
  mastery: number
}

interface Props {
  reviews: Review[]
}

const props = defineProps<Props>()

const width = 300
const height = 150
const padding = { top: 16, right: 16, bottom: 20, left: 32 }
const chartW = width - padding.left - padding.right
const chartH = height - padding.top - padding.bottom

const gridStepY = chartH / 3

const sortedReviews = computed(() =>
  [...props.reviews].sort((a, b) => a.date.localeCompare(b.date))
)

const dataPoints = computed(() => {
  const r = sortedReviews.value
  if (r.length === 0) return []
  return r.map((rev, i) => ({
    x: padding.left + (r.length === 1 ? chartW / 2 : (i / (r.length - 1)) * chartW),
    y: padding.top + chartH - (rev.mastery / 100) * chartH,
    mastery: rev.mastery,
  }))
})

const curvePath = computed(() => {
  const pts = dataPoints.value
  if (pts.length < 2) return null
  return 'M' + pts.map((p) => `${p.x},${p.y}`).join(' L')
})

const areaPath = computed(() => {
  const pts = dataPoints.value
  if (pts.length < 2) return null
  const baseline = padding.top + chartH
  return `M${pts[0].x},${baseline} ` + pts.map((p) => `L${p.x},${p.y}`).join(' ') + ` L${pts[pts.length - 1].x},${baseline} Z`
})

/* Ideal review schedule: exponential recovery from 100% decaying to ~40% */
const idealPath = computed(() => {
  const n = sortedReviews.value.length
  if (n < 2) return null
  const pts: string[] = []
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1)
    const mastery = 100 * Math.exp(-2.5 * t)
    const x = padding.left + t * chartW
    const y = padding.top + chartH - (mastery / 100) * chartH
    pts.push(`${x},${y}`)
  }
  return 'M' + pts.join(' L')
})

const optimalDots = computed(() => {
  const n = sortedReviews.value.length
  if (n < 2) return []
  const dots: { x: number; y: number }[] = []
  for (let i = 1; i < n; i++) {
    const t = i / (n - 1)
    const mastery = 100 * Math.exp(-2.5 * t)
    const x = padding.left + t * chartW
    const y = padding.top + chartH - (mastery / 100) * chartH
    dots.push({ x, y })
  }
  return dots
})

const xLabels = computed(() => {
  const r = sortedReviews.value
  if (r.length === 0) return []
  const step = r.length <= 4 ? 1 : Math.ceil(r.length / 4)
  const labels: { x: number; text: string }[] = []
  for (let i = 0; i < r.length; i += step) {
    const x = padding.left + (r.length === 1 ? chartW / 2 : (i / (r.length - 1)) * chartW)
    const d = r[i].date
    const text = d.length > 5 ? d.slice(5) : d
    labels.push({ x, text })
  }
  return labels
})
</script>

<style scoped>
.forgetting-curve {
  display: inline-flex;
  flex-direction: column;
  padding: var(--space-3);
}

.curve-svg {
  overflow: visible;
}

.axis-label {
  font-size: 9px;
  fill: var(--color-text-muted);
  font-family: var(--font-sans);
}
</style>
