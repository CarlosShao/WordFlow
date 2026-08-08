<template>
  <div class="daily-goal">
    <div class="goal-ring-wrapper">
      <svg class="goal-ring" :width="ringSize" :height="ringSize" :viewBox="`0 0 ${ringSize} ${ringSize}`">
        <!-- Track -->
        <circle
          :cx="center"
          :cy="center"
          :r="radius"
          fill="none"
          stroke="var(--color-border)"
          :stroke-width="strokeW"
        />
        <!-- Progress -->
        <circle
          :cx="center"
          :cy="center"
          :r="radius"
          fill="none"
          :stroke="ringColor"
          :stroke-width="strokeW"
          stroke-linecap="round"
          :stroke-dasharray="circ"
          :stroke-dashoffset="dashOffset"
          class="goal-progress"
          transform-origin="center"
        />
      </svg>
      <div class="goal-center">
        <span :class="['goal-pct', { 'goal-pct--done': isComplete }]">{{ percent }}%</span>
      </div>
      <!-- Celebration sparkles on 100% -->
      <div v-if="isComplete" class="goal-sparkles">
        <span v-for="i in 6" :key="i" class="sparkle" :style="sparkleStyle(i)" />
      </div>
    </div>
    <span v-if="label" class="goal-label">{{ label }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  current: number
  target: number
  label?: string
}

const props = defineProps<Props>()

const ringSize = 100
const strokeW = 8
const center = ringSize / 2
const radius = center - strokeW
const circ = 2 * Math.PI * radius

const percent = computed(() => {
  if (props.target <= 0) return 0
  return Math.min(100, Math.round((props.current / props.target) * 100))
})

const isComplete = computed(() => percent.value >= 100)

const dashOffset = computed(() => circ * (1 - percent.value / 100))

const ringColor = computed(() =>
  isComplete.value ? 'var(--color-success-600)' : 'var(--color-primary)'
)

function sparkleStyle(i: number) {
  const angle = (i - 1) * 60
  const rad = (angle * Math.PI) / 180
  const dist = 20
  return {
    '--sx': `${Math.cos(rad) * dist}px`,
    '--sy': `${Math.sin(rad) * dist}px`,
    animationDelay: `${(i - 1) * 0.1}s`,
  } as Record<string, string>
}
</script>

<style scoped>
.daily-goal {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
}

.goal-ring-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.goal-ring {
  transform: rotate(-90deg);
}

.goal-progress {
  transition: stroke-dashoffset 0.6s ease, stroke 0.4s ease;
}

.goal-center {
  position: absolute;
  display: flex;
  align-items: center;
  justify-content: center;
}

.goal-pct {
  font-family: var(--font-mono);
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-text);
  line-height: 1;
}

.goal-pct--done {
  color: var(--color-success-600);
  animation: celebratePulse 0.6s ease 1;
}

@keyframes celebratePulse {
  0% { transform: scale(1); }
  40% { transform: scale(1.2); }
  100% { transform: scale(1); }
}

/* Sparkles */
.goal-sparkles {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.sparkle {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--color-success-600);
  animation: sparkle 0.8s ease-out 1 forwards;
  opacity: 0;
}

@keyframes sparkle {
  0% {
    transform: translate(-50%, -50%) scale(0);
    opacity: 1;
  }
  70% {
    opacity: 1;
  }
  100% {
    transform: translate(calc(-50% + var(--sx)), calc(-50% + var(--sy))) scale(1);
    opacity: 0;
  }
}

.goal-label {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--color-text-muted);
  text-align: center;
}
</style>
